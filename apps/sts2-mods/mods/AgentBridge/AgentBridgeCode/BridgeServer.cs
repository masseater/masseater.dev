using System.Net;
using System.Text;
using System.Text.Json;
using AgentBridge.Protocol;

namespace AgentBridge.AgentBridgeCode;

internal static class BridgeServer
{
    private static HttpListener? listener;

    public static int Port { get; private set; }

    public static void Start(int port)
    {
        Port = port;
        listener = new HttpListener();
        listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        listener.Prefixes.Add($"http://localhost:{port}/");
        listener.Start();
        var thread = new Thread(Listen) { IsBackground = true, Name = MainFile.ModId };
        thread.Start();
        MainFile.Log.Info($"{MainFile.ModId} {MainFile.Version} listening on 127.0.0.1:{port}");
    }

    private static void Listen()
    {
        while (listener is { IsListening: true })
        {
            HttpListenerContext context = listener.GetContext();
            _ = Task.Run(() => HandleAsync(context));
        }
    }

    private static async Task HandleAsync(HttpListenerContext context)
    {
        HttpListenerResponse response = context.Response;
        try
        {
            string route = $"{context.Request.HttpMethod} {context.Request.Url?.AbsolutePath}";
            switch (route)
            {
                case "GET /state":
                    GameState state = await MainThread.Run(StateReader.Read);
                    await WriteAsync(response, HttpStatusCode.OK, "application/json", Json(state));
                    break;
                case "POST /action":
                    BridgeAction action = await ReadActionAsync(context.Request);
                    ActionResult result = await MainThread.Run(() => Actions.Perform(action));
                    await WriteAsync(response, HttpStatusCode.OK, "application/json", Json(result));
                    break;
                case "GET /screenshot":
                    byte[] png = await MainThread.Run(Screenshot.Capture);
                    await WriteAsync(response, HttpStatusCode.OK, "image/png", png);
                    break;
                default:
                    await WriteAsync(response, HttpStatusCode.NotFound, "text/plain", Encoding.UTF8.GetBytes(route));
                    break;
            }
        }
        catch (Exception exception) when (exception is JsonException or InvalidOperationException or ArgumentException or HttpListenerException)
        {
            MainFile.Log.Error($"{MainFile.ModId}: {exception}");
            await WriteAsync(response, HttpStatusCode.InternalServerError, "text/plain", Encoding.UTF8.GetBytes(exception.ToString()));
        }
    }

    private static async Task<BridgeAction> ReadActionAsync(HttpListenerRequest request)
    {
        using var reader = new StreamReader(request.InputStream, Encoding.UTF8);
        string body = await reader.ReadToEndAsync();
        return JsonSerializer.Deserialize<BridgeAction>(body, Converter.Settings)
            ?? throw new InvalidOperationException("empty action body");
    }

    private static byte[] Json<T>(T value) => JsonSerializer.SerializeToUtf8Bytes(value, Converter.Settings);

    private static async Task WriteAsync(HttpListenerResponse response, HttpStatusCode status, string contentType, byte[] body)
    {
        response.StatusCode = (int)status;
        response.ContentType = contentType;
        response.ContentLength64 = body.Length;
        await response.OutputStream.WriteAsync(body);
        response.Close();
    }
}
