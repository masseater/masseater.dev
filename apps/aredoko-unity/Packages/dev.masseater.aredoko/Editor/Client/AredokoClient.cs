#nullable enable

using System;
using System.Collections.Generic;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Aredoko.Protocol;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Aredoko.Client
{
    public sealed class AredokoClient : IDisposable
    {
        const string Unreachable = "管理アプリが起動していません";
        const string TimedOut = "管理アプリから応答がありません";
        const int BufferSize = 64 * 1024;
        const int SpanIdLength = 16;

        static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(15);
        static readonly TimeSpan LongRequestTimeout = TimeSpan.FromMinutes(10);

        static readonly HashSet<string> LongMethods = new HashSet<string>
        {
            AredokoRpcs.Extract.Method,
            AredokoRpcs.PutProjectAssets.Method,
        };

        static readonly string EndpointPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            EndpointFile.Directory,
            EndpointFile.Name);

        readonly JsonSerializer serializer = JsonSerializer.Create(Converter.Settings);
        readonly Dictionary<long, TaskCompletionSource<JToken>> pending = new Dictionary<long, TaskCompletionSource<JToken>>();
        readonly SemaphoreSlim connecting = new SemaphoreSlim(1, 1);
        readonly SemaphoreSlim sending = new SemaphoreSlim(1, 1);
        ClientWebSocket? socket;
        CancellationTokenSource? lifetime;
        long nextId;

        public static AredokoClient Shared { get; } = new AredokoClient();

        public async Task<TSuccess> Call<TPayload, TSuccess, TError>(Rpc<TPayload, TSuccess, TError> rpc, TPayload payload)
        {
            var traceId = Guid.NewGuid().ToString("N");
            try
            {
                return await Request(rpc, payload, traceId);
            }
            catch (AredokoException exception) when (exception.TraceId == null)
            {
                throw new AredokoException(exception.Message, exception.Unreachable, traceId);
            }
        }

        public Task<TSuccess> Call<TSuccess, TError>(Rpc<Empty, TSuccess, TError> rpc) => Call(rpc, new Empty());

        async Task<TSuccess> Request<TPayload, TSuccess, TError>(Rpc<TPayload, TSuccess, TError> rpc, TPayload payload, string traceId)
        {
            var connected = await Connect();
            var id = Interlocked.Increment(ref nextId);
            var completion = new TaskCompletionSource<JToken>(TaskCreationOptions.RunContinuationsAsynchronously);
            lock (pending)
            {
                pending[id] = completion;
            }

            try
            {
                var request = new JObject
                {
                    ["jsonrpc"] = "2.0",
                    ["id"] = id,
                    ["method"] = rpc.Method,
                    ["params"] = payload is Empty ? JValue.CreateNull() : JToken.FromObject(payload!, serializer),
                    ["traceId"] = traceId,
                    ["spanId"] = Guid.NewGuid().ToString("N").Substring(0, SpanIdLength),
                    ["sampled"] = true,
                };
                var timeout = LongMethods.Contains(rpc.Method) ? LongRequestTimeout : RequestTimeout;
                var result = await Within(Exchange(connected, request.ToString(Formatting.None), completion.Task), timeout);
                if (typeof(TSuccess) == typeof(Empty))
                {
                    return (TSuccess)(object)new Empty();
                }

                return result.ToObject<TSuccess>(serializer)!;
            }
            finally
            {
                lock (pending)
                {
                    pending.Remove(id);
                }
            }
        }

        async Task<JToken> Exchange(ClientWebSocket target, string text, Task<JToken> response)
        {
            await Send(target, text);
            return await response;
        }

        static async Task<JToken> Within(Task<JToken> response, TimeSpan timeout)
        {
            using var timer = new CancellationTokenSource();
            var finished = await Task.WhenAny(response, Task.Delay(timeout, timer.Token));
            timer.Cancel();
            if (finished != response)
            {
                throw new AredokoException(TimedOut, true);
            }

            return await response;
        }

        public void Dispose()
        {
            lifetime?.Cancel();
            socket?.Dispose();
            socket = null;
        }

        async Task<ClientWebSocket> Connect()
        {
            await connecting.WaitAsync();
            try
            {
                if (socket != null && socket.State == WebSocketState.Open)
                {
                    return socket;
                }

                socket?.Dispose();
                lifetime?.Cancel();
                var created = new ClientWebSocket();
                try
                {
                    await created.ConnectAsync(ReadEndpoint(), CancellationToken.None);
                }
                catch (Exception)
                {
                    created.Dispose();
                    throw new AredokoException(Unreachable, true);
                }

                socket = created;
                lifetime = new CancellationTokenSource();
                _ = Receive(created, lifetime.Token);
                return created;
            }
            finally
            {
                connecting.Release();
            }
        }

        static Uri ReadEndpoint()
        {
            var endpoint = JsonConvert.DeserializeObject<ServerEndpoint>(File.ReadAllText(EndpointPath), Converter.Settings)!;
            return new Uri($"ws://{EndpointFile.Host}:{endpoint.Port}/?{EndpointFile.TokenParameter}={Uri.EscapeDataString(endpoint.Token)}");
        }

        async Task Send(ClientWebSocket target, string text)
        {
            await sending.WaitAsync();
            try
            {
                var bytes = Encoding.UTF8.GetBytes(text);
                await target.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch (Exception)
            {
                throw new AredokoException(Unreachable, true);
            }
            finally
            {
                sending.Release();
            }
        }

        async Task Receive(ClientWebSocket source, CancellationToken token)
        {
            var buffer = new byte[BufferSize];
            try
            {
                while (!token.IsCancellationRequested && source.State == WebSocketState.Open)
                {
                    using var message = new MemoryStream();
                    WebSocketReceiveResult received;
                    do
                    {
                        received = await source.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                        if (received.MessageType == WebSocketMessageType.Close)
                        {
                            return;
                        }

                        message.Write(buffer, 0, received.Count);
                    }
                    while (!received.EndOfMessage);

                    Dispatch(Encoding.UTF8.GetString(message.ToArray()));
                }
            }
            catch (Exception)
            {
            }
            finally
            {
                FailAll();
                source.Abort();
            }
        }

        void Dispatch(string text)
        {
            var response = JObject.Parse(text);
            var id = response.Value<long?>("id");
            if (id == null)
            {
                return;
            }

            TaskCompletionSource<JToken>? completion;
            lock (pending)
            {
                if (!pending.TryGetValue(id.Value, out completion))
                {
                    return;
                }

                pending.Remove(id.Value);
            }

            if (response.TryGetValue("error", out var error))
            {
                completion.TrySetException(new AredokoException(MessageOf(error)));
                return;
            }

            completion.TrySetResult(response["result"] ?? JValue.CreateNull());
        }

        void FailAll()
        {
            List<TaskCompletionSource<JToken>> failed;
            lock (pending)
            {
                failed = new List<TaskCompletionSource<JToken>>(pending.Values);
                pending.Clear();
            }

            foreach (var completion in failed)
            {
                completion.TrySetException(new AredokoException(Unreachable, true));
            }
        }

        static string MessageOf(JToken error)
        {
            var failure = error.SelectToken("data[0].error");
            if (failure != null && failure.Value<string>("_tag") == "RequestFailed")
            {
                return failure.Value<string>("message") ?? "処理に失敗しました";
            }

            return error.Value<string>("message") ?? "処理に失敗しました";
        }
    }
}
