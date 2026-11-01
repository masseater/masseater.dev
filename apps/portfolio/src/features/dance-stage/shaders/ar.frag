// note: 中継の画面の中で、踊る人の隣の床に黄色い丸いキャラクターを出し、拍に合わせて跳ねさせる。影を床に落とし、頭上には CG の惑星を回して、隅に中継の印を出す。
// text: LIVE
void main() {
  vec3 c = rgb(uv);
  vec2 foot = vec2(bodyCenter().x + 0.25, 0.9);
  float hop = exp(-beat * 5.0) * 0.08 * step(beat, 0.6);
  vec2 body = foot - vec2(0.0, 0.12 + hop);
  vec2 sd = (uv - foot) * vec2(aspect(), 5.0);
  c *= 1.0 - 0.4 * smoothstep(0.12, 0.05, length(sd)) * (1.0 - hop * 5.0);
  float d = dist(uv, body);
  vec3 yellow = vec3(1.0, 0.85, 0.2) * (0.75 + 0.35 * smoothstep(0.12, 0.0, dist(uv, body - vec2(0.03, 0.04))));
  c = mix(c, yellow, smoothstep(0.1, 0.095, d));
  c = mix(c, vec3(0.1), smoothstep(0.012, 0.009, dist(uv, body + vec2(-0.02, -0.02))));
  c = mix(c, vec3(0.1), smoothstep(0.012, 0.009, dist(uv, body + vec2(0.02, -0.02))));
  c = mix(c, vec3(0.8, 0.3, 0.3), smoothstep(0.004, 0.0, abs(dist(uv, body + vec2(0.0, 0.0)) - 0.03)) * step(body.y + 0.01, uv.y));
  vec2 planet = vec2(0.2, 0.22);
  vec2 pd = (uv - planet) * vec2(aspect(), 1.0);
  float pr = length(pd);
  vec3 pc = hsv(vec3(0.55 + 0.05 * sin(pd.y * 60.0 + time), 0.6, 0.9)) * (0.5 + 0.5 * smoothstep(0.08, 0.0, length(pd - vec2(-0.03, -0.03))));
  c = mix(c, pc, smoothstep(0.08, 0.077, pr));
  float ring = abs(length(rot(pd, 0.4) * vec2(1.0, 3.0)) - 0.12);
  c = mix(c, vec3(0.9, 0.8, 0.6), smoothstep(0.008, 0.0, ring) * (step(0.08, pr) + step(0.0, rot(pd, 0.4).y)) * 0.8);
  c = mix(c, vec3(0.85, 0.1, 0.1), step(0.82, uv.x) * step(uv.x, 0.96) * step(0.04, uv.y) * step(uv.y, 0.1));
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.89, 0.07), 0.04, 0));
  outColor = vec4(c, 1.0);
}
