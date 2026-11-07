#nullable enable

using System;

namespace Aredoko.Client
{
    public sealed class AredokoException : Exception
    {
        public AredokoException(string message, bool unreachable = false, string? traceId = null)
            : base(message)
        {
            Unreachable = unreachable;
            TraceId = traceId;
        }

        public bool Unreachable { get; }

        public string? TraceId { get; }
    }
}
