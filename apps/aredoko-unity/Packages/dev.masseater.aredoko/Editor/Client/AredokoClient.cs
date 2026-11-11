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
        readonly Dictionary<long, TaskCompletionSource<RpcResponse>> pending = new Dictionary<long, TaskCompletionSource<RpcResponse>>();
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
            var completion = new TaskCompletionSource<RpcResponse>(TaskCreationOptions.RunContinuationsAsynchronously);
            lock (pending)
            {
                pending[id] = completion;
            }

            try
            {
                var request = new RpcRequest
                {
                    Jsonrpc = Jsonrpc.The20,
                    Id = id,
                    Method = rpc.Method,
                    Params = payload is Empty ? null! : JToken.FromObject(payload!, serializer),
                    TraceId = traceId,
                    SpanId = Guid.NewGuid().ToString("N").Substring(0, SpanIdLength),
                    Sampled = true,
                };
                var timeout = LongMethods.Contains(rpc.Method) ? LongRequestTimeout : RequestTimeout;
                var text = JsonConvert.SerializeObject(request, Converter.Settings);
                var response = await Within(Exchange(connected, text, completion.Task), timeout);
                if (response.Error != null)
                {
                    throw new AredokoException(MessageOf<TError>(response.Error));
                }

                if (typeof(TSuccess) == typeof(Empty))
                {
                    return (TSuccess)(object)new Empty();
                }

                return TokenOf(response.Result).ToObject<TSuccess>(serializer)!;
            }
            finally
            {
                lock (pending)
                {
                    pending.Remove(id);
                }
            }
        }

        static JToken TokenOf(object? value) => value as JToken ?? JValue.CreateNull();

        async Task<RpcResponse> Exchange(ClientWebSocket target, string text, Task<RpcResponse> response)
        {
            await Send(target, text);
            return await response;
        }

        static async Task<RpcResponse> Within(Task<RpcResponse> response, TimeSpan timeout)
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
            var response = JsonConvert.DeserializeObject<RpcResponse>(text, Converter.Settings);
            var id = response?.Id;
            if (response == null || id == null)
            {
                return;
            }

            TaskCompletionSource<RpcResponse>? completion;
            lock (pending)
            {
                if (!pending.TryGetValue(id.Value, out completion))
                {
                    return;
                }

                pending.Remove(id.Value);
            }

            completion.TrySetResult(response);
        }

        void FailAll()
        {
            List<TaskCompletionSource<RpcResponse>> failed;
            lock (pending)
            {
                failed = new List<TaskCompletionSource<RpcResponse>>(pending.Values);
                pending.Clear();
            }

            foreach (var completion in failed)
            {
                completion.TrySetException(new AredokoException(Unreachable, true));
            }
        }

        string MessageOf<TError>(RpcError error)
        {
            if (error.Tag != RpcErrorTag.Cause)
            {
                return error.Message;
            }

            var reasons = TokenOf(error.Data).ToObject<RpcCauseReason[]>(serializer) ?? Array.Empty<RpcCauseReason>();
            foreach (var reason in reasons)
            {
                if (reason.Tag == WireCauseReasonTag.Fail && TokenOf(reason.Error).ToObject<TError>(serializer) is RequestFailedEncoded failed)
                {
                    return failed.Message;
                }
            }

            return error.Message;
        }
    }
}
