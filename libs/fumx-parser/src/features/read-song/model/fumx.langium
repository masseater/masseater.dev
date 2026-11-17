grammar Fumx

entry Song:
    imports+=Import*
    ('song' title=STRING)?
    declarations+=Declaration*
    body+=Statement*;

Import:
    'import' '{' symbols+=ImportedSymbol (',' symbols+=ImportedSymbol)* '}' 'from' path=STRING;

ImportedSymbol:
    target=[Exportable:Name];

type Exportable = Sample | Kit | Instrument | Bus | Track | Plugin | Fn | Let;

Declaration:
    Groove | Sample | Kit | Instrument | Bus | Track | Duck | Master | Plugin;

Plugin:
    'plugin' name=ID 'from' module=STRING '{' params+=PluginParam* '}';

PluginParam:
    name=Name ':' type=ScalarType ('=' default=Literal)?;

PluginUse:
    plugin=[Plugin:ID] arguments+=PluginArgument*;

PluginArgument:
    name=Name value=Literal;

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
    MultiSample | SingleSample | PluginInstrument;

PluginInstrument:
    'plugin' use=PluginUse;

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
    'bus' name=Name Mixer ('fx' fx=FxChain)? sends+=Send*;

Track:
    'track' name=Name source=TrackSource ('role' role=Role)? Mixer ('fx' fx=FxChain)? sends+=Send*;

fragment Mixer:
    ('volume' volume=DECIBELS)? ('pan' pan=PERCENT)? (muted?='mute')?;

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
    Highpass | Lowpass | Reverb | Delay | Comp | Chorus | Width | Limit | Phaser | Tremolo | Drive | Gain | PluginEffect;

PluginEffect:
    use=PluginUse;

Reverb: 'reverb' 'ir' left=STRING right=STRING? ('predelay' predelay=MILLISECONDS)? ('mix' mix=PERCENT)?;
Delay: 'delay' (beats=FRACTION | time=MILLISECONDS) 'feedback' feedback=PERCENT ('lowpass' lowpass=HERTZ)? ('highpass' highpass=HERTZ)? ('pingpong' pingpong=PERCENT)?;
Comp: 'comp' threshold=DECIBELS ratio=RATIO ('attack' attack=MILLISECONDS)? ('release' release=MILLISECONDS)? ('makeup' makeup=DECIBELS)?;
Chorus: 'chorus' depth=MILLISECONDS rate=HERTZ mix=PERCENT ('base' base=MILLISECONDS)?;
Width: 'width' amount=PERCENT ('mono-below' monoBelow=HERTZ)?;
Limit: 'limit' ceiling=DECIBELS ('lookahead' lookahead=MILLISECONDS)? ('release' release=MILLISECONDS)?;
Phaser: 'phaser' rate=HERTZ 'from' low=HERTZ 'to' high=HERTZ ('feedback' feedback=PERCENT)? ('mix' mix=PERCENT)?;
Tremolo: 'tremolo' rate=HERTZ depth=PERCENT;

Statement:
    Bar | Let | Fn | If | For | While | Repeat | Return | Assign | CallStatement;

Let:
    'let' name=Name (':' type=TypeRef)? '=' value=Expression;

Fn:
    'fn' name=Name '(' (params+=Param (',' params+=Param)*)? ')' (':' returns=TypeRef)?
    '{' body+=Statement* '}';

Param:
    name=Name ':' type=TypeRef;

If:
    'if' condition=Expression '{' then+=Statement* '}'
    ('else' (otherwise=If | '{' else+=Statement* '}'))?;

For:
    'for' name=Name 'in' items=Expression '{' body+=Statement* '}';

While:
    'while' condition=Expression '{' body+=Statement* '}';

Repeat:
    'repeat' count=Expression '{' body+=Statement* '}';

Return:
    {infer Return} 'return' value=Expression?;

Assign:
    target=[Binding:Name] '=' value=Expression;

CallStatement:
    callee=[Fn:Name] '(' (args+=Expression (',' args+=Expression)*)? ')';

type Binding = Let | Param | For | Each;

TypeRef:
    ListType | ScalarType;

ListType:
    '[' element=TypeRef ']';

ScalarType:
    name=('number' | 'pitch' | 'duration' | 'decibels' | 'percent' | 'hertz' | 'time' | 'semitones' | 'string' | 'bool');

Expression:
    Or;

Or infers Expression:
    And ({infer Binary.left=current} operator='or' right=And)*;

And infers Expression:
    Comparison ({infer Binary.left=current} operator='and' right=Comparison)*;

Comparison infers Expression:
    Additive ({infer Binary.left=current} operator=('==' | '!=' | '<' | '<=' | '>' | '>=') right=Additive)?;

Additive infers Expression:
    Multiplicative ({infer Binary.left=current} operator=('+' | '-') right=Multiplicative)*;

Multiplicative infers Expression:
    Prefix ({infer Binary.left=current} operator=('*' | '/' | 'mod') right=Prefix)*;

Prefix infers Expression:
    {infer Unary} operator=('-' | 'not') operand=Prefix | Postfix;

Postfix infers Expression:
    Primary ({infer Index.list=current} '[' index=Expression ']')*;

Primary infers Expression:
    Literal | ListLiteral | Builtin | Call | Ref | Group;

Group:
    '(' inner=Expression ')';

Literal:
    pitch=PITCH | duration=FRACTION | decibels=DECIBELS | percent=PERCENT | hertz=HERTZ | time=MILLISECONDS
    | semitones=SEMITONES | text=STRING | number=NUMBER | truth=('true' | 'false');

ListLiteral:
    {infer ListLiteral} '[' (items+=Expression (',' items+=Expression)*)? ']';

Builtin:
    name=('range' | 'len' | 'push' | 'floor' | 'random') '(' (args+=Expression (',' args+=Expression)*)? ')';

Call:
    callee=[Fn:Name] '(' (args+=Expression (',' args+=Expression)*)? ')';

Ref:
    target=[Binding:Name];

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
    VoiceLine | ControlLine | TempoLine | Automation;

ControlLine:
    track=[Track:Name] '.' control=Control ':' steps+=ControlStep (',' steps+=ControlStep)*;

Control:
    kind='cc' number=NUMBER | kind='pressure' pitch=PITCH? | kind=('bend' | 'program');

ControlStep:
    ControlHold | Rest;

ControlHold:
    value=ControlValue ('->' target=ControlValue)? duration=FRACTION;

ControlValue:
    number=NUMBER | semitones=SEMITONES;

TempoLine:
    'tempo' ':' steps+=TempoStep (',' steps+=TempoStep)*;

TempoStep:
    bpm=BPM ('->' target=BPM)? duration=FRACTION;

VoiceLine:
    (master?='master' | track=[Track:Name]) ':' events+=Event (',' events+=Event)*;

Automation:
    'automate' target=[Mixable:Name] '.' parameter=Name ('.' field=Name)? from=Amount '->' to=Amount 'over' span=BARS ('curve' curve=('linear' | 'exp'))?;

Amount:
    value=(HERTZ | DECIBELS | PERCENT | MILLISECONDS | SEMITONES | NUMBER);

Event:
    Rest | Tuplet | Each | Sounding;

Each:
    'each' name=Name 'in' items=Expression '{' events+=Event (',' events+=Event)* '}';

Rest:
    'rest' (duration=FRACTION | '(' computedDuration=Expression ')');

Tuplet:
    'tuplet' ratio=RATIO '{' events+=Event (',' events+=Event)* '}';

Sounding:
    head=Head (duration=FRACTION | '(' computedDuration=Expression ')') attributes+=Attribute*;

Head:
    Chord | Note | Slice | Edit | Hit | Computed;

Computed: '(' value=Expression ')';

Chord: '[' notes+=Note+ ']';
Note: pitch=PITCH;
Slice: sample=[Sample:Name] '.' 'slice' '(' index=NUMBER ')';
Edit: kind=('mute' | 'stutter' | 'tapestop' | 'reverse-slice');
Hit: voice=Name;

Attribute:
    Velocity | ReleaseVelocity | GateLength | Tie | Articulation | Lyric | Bend | Nudge | Fade | Every | PlayParam;

Velocity: 'vel' (value=NUMBER | '(' computed=Expression ')');
ReleaseVelocity: 'off' value=NUMBER;
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
    ID | 'melody' | 'countermelody' | 'bass' | 'harmony' | 'drums' | 'texture' | 'delay' | 'reverb' | 'chorus' | 'comp' | 'limit' | 'width' | 'phaser' | 'tremolo' | 'drive' | 'gain' | 'pan' | 'sample' | 'release' | 'attack' | 'decay' | 'offset' | 'length' | 'mix' | 'base' | 'from' | 'to' | 'q' | 'ir' | 'predelay' | 'feedback' | 'pingpong' | 'lookahead' | 'makeup' | 'semi' | 'highpass' | 'lowpass' | 'slice' | 'slices' | 'onsets' | 'root' | 'hold' | 'depth' | 'by' | 'over' | 'curve' | 'linear' | 'exp' | 'every' | 'fade' | 'nudge' | 'bend' | 'lyric' | 'gate' | 'vel' | 'tie' | 'staccato' | 'legato' | 'accent' | 'reverse' | 'audio' | 'kit' | 'instrument' | 'track' | 'bus' | 'duck' | 'groove' | 'swing' | 'multisample' | 'song' | 'bar' | 'meter' | 'tempo' | 'section' | 'mark' | 'automate' | 'fx' | 'send' | 'role' | 'mono-below' | 'volume' | 'plugin' | 'number' | 'pitch' | 'duration' | 'decibels' | 'percent' | 'hertz' | 'time' | 'semitones' | 'string' | 'bool' | 'cc' | 'pressure' | 'program' | 'off';

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
