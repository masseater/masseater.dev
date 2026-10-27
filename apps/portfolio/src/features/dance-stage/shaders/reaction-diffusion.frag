// note: 2 つの物質が混ざり合って広がる式を毎コマ 1 歩ずつ計算し、生き物の模様のような斑点や縞を育てる。種は踊る人の形の中に 8 秒ごとにまき直す。
// pass: field persistent
uniform sampler2D field;
void main() {
  vec2 px = 1.0 / resolution * 2.0;
  vec4 here = read(field, uv);
  float cycle = mod(floor(time / 8.0), 250.0) + 1.0;
  float a = here.r;
  float b = here.g;
  if (floor(here.a * 255.0 + 0.5) != cycle) {
    a = 1.0;
    b = step(0.5, matte(uv)) * step(0.7, hash(floor(uv * 120.0)));
  }
  vec2 lap = -vec2(a, b);
  lap += vec2(read(field, uv + vec2(px.x, 0.0)).rg + read(field, uv - vec2(px.x, 0.0)).rg + read(field, uv + vec2(0.0, px.y)).rg + read(field, uv - vec2(0.0, px.y)).rg) * 0.2;
  lap += vec2(read(field, uv + px).rg + read(field, uv - px).rg + read(field, uv + vec2(px.x, -px.y)).rg + read(field, uv + vec2(-px.x, px.y)).rg) * 0.05;
  float feed = 0.037;
  float kill = 0.06;
  float abb = a * b * b;
  a += lap.x * 1.0 - abb + feed * (1.0 - a);
  b += lap.y * 0.5 + abb - (kill + feed) * b;
  outColor = vec4(clamp(a, 0.0, 1.0), clamp(b, 0.0, 1.0), 0.0, cycle / 255.0);
}
// pass:
uniform sampler2D field;
void main() {
  float b = read(field, uv).g;
  vec3 c = mix(vec3(0.95, 0.9, 0.8), vec3(0.15, 0.1, 0.25), smoothstep(0.1, 0.3, b));
  c = mix(c, rgb(uv), 0.15);
  outColor = vec4(c, 1.0);
}
