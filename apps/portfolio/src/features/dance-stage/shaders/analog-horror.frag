// note: 色の抜けた低い解像度の VHS の映像にし、走査の乱れの帯を上下に走らせ、隅に録画の日時を出す。ときどき放送を切り替えたような警告の字幕を青い帯で出す。
// text: REC  1997.10.27  03:14
// text: 外に出ないでください
void main() {
  vec2 g = vec2(240.0, 135.0);
  vec2 p = (floor(uv * g) + 0.5) / g;
  float band = smoothstep(0.03, 0.0, abs(uv.y - fract(time * 0.13)));
  p.x += band * (hash(vec2(floor(uv.y * 135.0), floor(time * 20.0))) - 0.5) * 0.05;
  vec3 c = vec3(luma(rgb(p)));
  c = mix(c, c * vec3(0.9, 1.0, 0.85), 0.5);
  c = (c - 0.5) * 0.8 + 0.45;
  c += (hash(uv * resolution + floor(time * 24.0)) - 0.5) * 0.12;
  c += band * 0.25;
  c = mix(c, vec3(0.9), textBox(uv, vec2(0.2, 0.08), 0.04, 0));
  float warn = step(4.0, mod(time, 9.0)) * step(mod(time, 9.0), 7.0);
  if (warn > 0.5 && uv.y > 0.78 && uv.y < 0.9) {
    c = vec3(0.05, 0.1, 0.5);
    c = mix(c, vec3(1.0), textBox(uv, vec2(0.5, 0.84), 0.06, 1));
  }
  c *= 1.0 - 0.4 * length((uv - 0.5) * vec2(1.0, 1.2));
  outColor = vec4(c, 1.0);
}
