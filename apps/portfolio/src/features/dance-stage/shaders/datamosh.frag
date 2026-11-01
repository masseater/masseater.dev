// note: 3 秒ごとにだけ本物の画を入れ、それ以外のフレームは前の画を明るさの変化の向きへ押し流して作る。
// pass: mosh persistent
uniform sampler2D mosh;
void main() {
  float key = step(fract(time / 3.0), 0.02);
  vec2 px = 1.0 / resolution;
  vec3 prev = read(mosh, uv).rgb;
  float diff = luma(rgb(uv)) - luma(prev);
  vec2 grad = vec2(luma(rgb(uv + vec2(px.x, 0))) - luma(rgb(uv - vec2(px.x, 0))), luma(rgb(uv + vec2(0, px.y))) - luma(rgb(uv - vec2(0, px.y))));
  vec2 flow = grad * diff * 40.0 + vec2(0.0, -0.0015) * matte(uv);
  vec3 moshed = read(mosh, uv - flow).rgb;
  outColor = vec4(mix(moshed, rgb(uv), max(key, 0.02)), 1.0);
}
// pass:
uniform sampler2D mosh;
void main() { outColor = read(mosh, uv); }
