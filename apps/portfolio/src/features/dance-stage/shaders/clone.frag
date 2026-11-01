// note: 0.6 秒前と 1.2 秒前の人物を切り抜いて左右に並べ、3 人が少しずつずれて同じ振りを踊っているように合成する。
void main() {
  vec3 c = plate(uv);
  vec2 left = uv + vec2(0.28, 0.0);
  vec2 right = uv - vec2(0.28, 0.0);
  c = mix(c, pastRgb(left, time - 1.2), pastMatte(left, time - 1.2) * inside(left));
  c = mix(c, pastRgb(right, time - 0.6), pastMatte(right, time - 0.6) * inside(right));
  c = mix(c, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
