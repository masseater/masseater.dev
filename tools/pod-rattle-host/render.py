import argparse

import mido
import pedalboard
from pedalboard.io import AudioFile

parser = argparse.ArgumentParser()
parser.add_argument("plugin")
parser.add_argument("midi")
parser.add_argument("wav")
parser.add_argument("--sample-rate", type=int, required=True)
parser.add_argument("--block", type=int, required=True)
parser.add_argument("--tail-seconds", type=float, required=True)
parser.add_argument("--param", action="append", default=[])
args = parser.parse_args()

plugin = pedalboard.load_plugin(args.plugin)
by_name = {parameter.name: parameter for parameter in plugin.parameters.values()}
for assignment in args.param:
    name, value = assignment.split(":")
    by_name[name].raw_value = float(value)

messages = []
seconds = 0.0
for message in mido.MidiFile(args.midi):
    seconds += message.time
    if not message.is_meta:
        messages.append((message.bytes(), seconds))

audio = plugin(
    messages,
    duration=seconds + args.tail_seconds,
    sample_rate=args.sample_rate,
    num_channels=2,
    buffer_size=args.block,
    reset=True,
)
with AudioFile(args.wav, "w", args.sample_rate, 2, bit_depth=32) as file:
    file.write(audio)
