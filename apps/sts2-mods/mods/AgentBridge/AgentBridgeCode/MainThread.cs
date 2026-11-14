using System.Collections.Concurrent;
using Godot;

namespace AgentBridge.AgentBridgeCode;

/// <summary>HTTP のスレッドから受けた処理を、ゲームのメインスレッドの次のフレームで動かす。</summary>
internal static class MainThread
{
    private static readonly ConcurrentQueue<Task> Queue = new();

    public static void Attach(SceneTree tree) => tree.ProcessFrame += Drain;

    public static Task<T> Run<T>(Func<T> work)
    {
        var task = new Task<T>(work);
        Queue.Enqueue(task);
        return task;
    }

    private static void Drain()
    {
        while (Queue.TryDequeue(out Task? task))
        {
            task.RunSynchronously();
        }
    }
}
