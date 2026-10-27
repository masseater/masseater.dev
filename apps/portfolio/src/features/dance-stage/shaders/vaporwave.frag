// note: 桃色から水色の空に横縞の夕日とヤシの木の影を置き、床に紫の格子を敷いて、踊る人を桃色と青緑の 2 色に寄せる。全体に VHS の色のにじみを掛け、全角の題字を添える。
// text: ＳＥＩＫＩＮ　ダンス
void main() {
  vec3 sky = mix(vec3(1.0, 0.6, 0.85), vec3(0.45, 0.85, 1.0), smoothstep(0.65, 0.0, uv.y));
  vec2 sd = (uv - vec2(0.5, 0.55)) * vec2(aspect(), 1.0);
  float sun = step(length(sd), 0.22) * min(step(uv.y, 0.45) + step(0.35, fract(uv.y * 30.0)), 1.0) * step(uv.y, 0.6);
  vec3 c = mix(sky, vec3(1.0, 0.85, 0.4), sun);
  float palm = step(abs(uv.x - 0.12 - (0.6 - uv.y) * 0.05) * aspect(), 0.012) * step(0.25, uv.y) * step(uv.y, 0.6);
  palm += step(length((uv - vec2(0.15, 0.25)) * vec2(aspect(), 3.0)), 0.12) * step(0.5, fract(atan(uv.y - 0.25, uv.x - 0.15) * 2.0));
  c = mix(c, vec3(0.25, 0.1, 0.35), min(palm, 1.0));
  if (uv.y > 0.6) {
    float depth = (uv.y - 0.6) / 0.4;
    vec2 g = vec2((uv.x - 0.5) / depth, 1.0 / depth + time * 0.8);
    float line = step(0.94, fract(g.x * 4.0)) + step(0.9, fract(g.y));
    c = mix(vec3(0.15, 0.05, 0.25), vec3(1.0, 0.4, 0.9), min(line, 1.0));
  }
  vec3 person = vec3(rgb(uv + vec2(0.006, 0.0)).r, rgb(uv).g, rgb(uv - vec2(0.006, 0.0)).b);
  float l = luma(person);
  vec3 duo = mix(vec3(0.2, 0.75, 0.75), vec3(1.0, 0.55, 0.85), l);
  c = mix(c, duo, matte(uv));
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.5, 0.1), 0.08, 0));
  c += (hash(vec2(floor(uv.y * 240.0), floor(time * 30.0))) - 0.5) * 0.04;
  outColor = vec4(c, 1.0);
}
