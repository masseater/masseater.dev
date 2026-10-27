// note: 緑に光る点 1 つで踊る人の骨格を一筆書きに何度もなぞり、左右の音を縦と横に振ったように線を描く。帯域の強さで線が細かく震え、走った跡はしばらく光って消える。
// pass: trace persistent
uniform sampler2D trace;
vec2 pathPoint(float s) {
  int seq[22] = int[22](0, 11, 13, 15, 13, 11, 23, 25, 27, 25, 23, 24, 26, 28, 26, 24, 12, 14, 16, 14, 12, 0);
  float f = mod(s, 21.0);
  int i = int(floor(f));
  vec2 a = joint(seq[i]);
  vec2 b = joint(seq[i + 1]);
  vec2 p = mix(a, b, fract(f));
  float wob = bands[1] * 0.006 * sin(s * 9.0) + bands[5] * 0.003 * sin(s * 23.0);
  return p + vec2(wob / aspect(), wob * 0.7);
}
void main() {
  vec3 old = read(trace, uv).rgb * 0.86;
  float head = time * 42.0;
  float d = 9.0;
  for (int k = 0; k < 24; k++) {
    float s0 = head - float(k) * 0.12;
    d = min(d, segment(uv, pathPoint(s0), pathPoint(s0 - 0.12)));
  }
  vec3 beam = vec3(0.35, 1.0, 0.45) * (smoothstep(0.004, 0.0, d) + 0.35 * smoothstep(0.015, 0.0, d));
  outColor = vec4(max(old, beam), 1.0);
}
// pass:
uniform sampler2D trace;
void main() {
  vec2 g = abs(fract(uv * vec2(10.0, 8.0)) - 0.5);
  float grid = step(0.49, max(g.x, g.y)) * 0.12;
  vec3 c = vec3(0.01, 0.04, 0.02) + vec3(0.1, 0.3, 0.15) * grid;
  c += read(trace, uv).rgb;
  c += rgb(uv) * 0.06;
  outColor = vec4(c, 1.0);
}
