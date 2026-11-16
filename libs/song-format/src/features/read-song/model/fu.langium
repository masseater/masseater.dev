grammar Fu

entry Song:
    'song' title=STRING
    declarations+=Declaration*
    bars+=Bar*;

Declaration:
    Groove | Sample | Kit | Instrument | Bus | Track | Duck | Master;

Groove:
    'groove' 'swing' grid=FRACTION amount=PERCENT;

Sample:
    'sample' name=Name path=STRING ('slices' (onsets?='onsets' | count=NUMBER))?;

Kit:
    'kit' name=Name '{' voices+=KitVoice* '}';

KitVoice:
    name=Name path=STRING params+=PlayParam*;

Instrument:
    'instrument' name=Name source=InstrumentSource;

InstrumentSource:
    MultiSample | SingleSample;

MultiSample:
    'multisample' '{' zones+=Zone* '}';

SingleSample:
    'sample' path=STRING 'root' root=PITCH;

Zone:
    path=STRING 'root' root=PITCH;

PlayParam:
    Semi | Length | Attack | Release | Decay | Offset | Highpass | Lowpass | Gain | Pan | Drive | Send | Reverse;

Semi: 'semi' amount=SEMITONES;
Length: 'length' time=MILLISECONDS;
Attack: 'attack' time=MILLISECONDS;
Release: 'release' time=MILLISECONDS;
Decay: 'decay' time=MILLISECONDS;
Offset: 'offset' time=MILLISECONDS;
Highpass: 'highpass' frequency=HERTZ ('q' resonance=NUMBER)?;
Lowpass: 'lowpass' frequency=HERTZ ('->' target=HERTZ)? ('q' resonance=NUMBER)?;
Gain: 'gain' amount=DECIBELS;
Pan: 'pan' amount=PERCENT;
Drive: 'drive' amount=NUMBER;
Send: 'send' bus=[Bus:Name] amount=PERCENT;
Reverse: reverse?='reverse';

Bus:
    'bus' name=Name ('fx' fx=FxChain)? sends+=Send*;

Track:
    'track' name=Name source=TrackSource ('role' role=Role)? ('fx' fx=FxChain)? sends+=Send*;

TrackSource:
    KitSource | InstrumentRef | AudioSource;

KitSource: 'kit' kit=[Kit:Name];
InstrumentRef: 'instrument' instrument=[Instrument:Name];
AudioSource: audio?='audio';

Role returns string:
    'melody' | 'countermelody' | 'bass' | 'harmony' | 'drums' | 'texture';

type Mixable = Track | Bus;

Duck:
    'duck' targets+=[Mixable:Name] (',' targets+=[Mixable:Name])*
    'by' source=[Track:Name]
    'hold' hold=MILLISECONDS 'release' release=MILLISECONDS
    'depth' depths+=DuckDepth (',' depths+=DuckDepth)*;

DuckDepth:
    target=[Mixable:Name] amount=PERCENT;

Master:
    'master' 'fx' fx=FxChain;

FxChain:
    '[' effects+=Effect (',' effects+=Effect)* ']';

Effect:
    Highpass | Lowpass | Reverb | Delay | Comp | Chorus | Width | Limit | Phaser | Tremolo | Drive | Gain;

Reverb: 'reverb' 'ir' left=STRING right=STRING? ('predelay' predelay=MILLISECONDS)? ('mix' mix=PERCENT)?;
Delay: 'delay' (beats=FRACTION | time=MILLISECONDS) 'feedback' feedback=PERCENT ('lowpass' lowpass=HERTZ)? ('highpass' highpass=HERTZ)? ('pingpong' pingpong=PERCENT)?;
Comp: 'comp' threshold=DECIBELS ratio=RATIO ('attack' attack=MILLISECONDS)? ('release' release=MILLISECONDS)? ('makeup' makeup=DECIBELS)?;
Chorus: 'chorus' depth=MILLISECONDS rate=HERTZ mix=PERCENT ('base' base=MILLISECONDS)?;
Width: 'width' amount=PERCENT ('mono-below' monoBelow=HERTZ)?;
Limit: 'limit' ceiling=DECIBELS ('lookahead' lookahead=MILLISECONDS)? ('release' release=MILLISECONDS)?;
Phaser: 'phaser' rate=HERTZ 'from' low=HERTZ 'to' high=HERTZ ('feedback' feedback=PERCENT)? ('mix' mix=PERCENT)?;
Tremolo: 'tremolo' rate=HERTZ depth=PERCENT;

Bar:
    {infer Bar} 'bar'
    ('meter' meter=Meter)?
    ('tempo' tempo=Tempo)?
    ('section' section=Name)?
    ('mark' mark=STRING)?
    '{' lines+=Line* '}';

Meter:
    signature=FRACTION ('(' groups+=NUMBER ('+' groups+=NUMBER)* ')')?;

Tempo:
    bpm=BPM ('->' target=BPM 'over' span=BARS)?;

Line:
    VoiceLine | Automation;

VoiceLine:
    (master?='master' | track=[Track:Name]) ':' events+=Event (',' events+=Event)*;

Automation:
    'automate' target=[Mixable:Name] '.' parameter=Name from=Amount '->' to=Amount 'over' span=BARS ('curve' curve=('linear' | 'exp'))?;

Amount:
    value=(HERTZ | DECIBELS | PERCENT | MILLISECONDS | SEMITONES | NUMBER);

Event:
    Rest | Tuplet | Sounding;

Rest:
    'rest' duration=FRACTION;

Tuplet:
    'tuplet' ratio=RATIO '{' events+=Event (',' events+=Event)* '}';

Sounding:
    head=Head duration=FRACTION attributes+=Attribute*;

Head:
    Chord | Note | Slice | Edit | Hit;

Chord: '[' notes+=Note+ ']';
Note: pitch=PITCH;
Slice: sample=[Sample:Name] '.' 'slice' '(' index=NUMBER ')';
Edit: kind=('mute' | 'stutter' | 'tapestop' | 'reverse-slice');
Hit: voice=Name;

Attribute:
    Velocity | GateLength | Tie | Articulation | Lyric | Bend | Nudge | Fade | Every | PlayParam;

Velocity: 'vel' value=NUMBER;
GateLength: 'gate' amount=PERCENT;
Tie: tie?='tie';
Articulation: kind=('staccato' | 'legato' | 'accent');
Lyric: 'lyric' (text=STRING | melisma?='_');
Bend: 'bend' points+=BendPoint+;
BendPoint: at=MILLISECONDS ':' amount=SEMITONES;
Nudge: 'nudge' time=MILLISECONDS;
Fade: 'fade' time=MILLISECONDS;
Every: 'every' slice=FRACTION count=COUNT?;

Name returns string:
    ID | 'melody' | 'countermelody' | 'bass' | 'harmony' | 'drums' | 'texture' | 'delay' | 'reverb' | 'chorus' | 'comp' | 'limit' | 'width' | 'phaser' | 'tremolo' | 'drive' | 'gain' | 'pan' | 'sample' | 'release' | 'attack' | 'decay' | 'offset' | 'length' | 'mix' | 'base' | 'from' | 'to' | 'q' | 'ir' | 'predelay' | 'feedback' | 'pingpong' | 'lookahead' | 'makeup' | 'semi' | 'highpass' | 'lowpass' | 'slice' | 'slices' | 'onsets' | 'root' | 'hold' | 'depth' | 'by' | 'over' | 'curve' | 'linear' | 'exp' | 'every' | 'fade' | 'nudge' | 'bend' | 'lyric' | 'gate' | 'vel' | 'tie' | 'staccato' | 'legato' | 'accent' | 'reverse' | 'audio' | 'kit' | 'instrument' | 'track' | 'bus' | 'duck' | 'groove' | 'swing' | 'multisample' | 'song' | 'bar' | 'meter' | 'tempo' | 'section' | 'mark' | 'automate' | 'fx' | 'send' | 'role' | 'mono-below';

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

terminal PITCH: /[A-G](##|#|bb|b)?-?[0-9]([+-][0-9]+c)?/;
terminal FRACTION: /[0-9]+\/[0-9]+/;
terminal RATIO: /[0-9]+(\.[0-9]+)?:[0-9]+(\.[0-9]+)?/;
terminal BPM: /[0-9]+(\.[0-9]+)?bpm/;
terminal BARS: /[0-9]+bar/;
terminal MILLISECONDS: /[+-]?[0-9]+(\.[0-9]+)?ms/;
terminal HERTZ: /[0-9]+(\.[0-9]+)?k?Hz/;
terminal DECIBELS: /[+-]?[0-9]+(\.[0-9]+)?dB/;
terminal PERCENT: /[+-]?[0-9]+(\.[0-9]+)?%/;
terminal SEMITONES: /[+-]?[0-9]+(\.[0-9]+)?st/;
terminal COUNT: /x[0-9]+/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]+)?/;
terminal STRING: /"(\\.|[^"\\])*"/;
terminal ID: /[a-z][a-z0-9]*(-[a-z0-9]+)*/;
