// note: 人物と、人物を消した部屋の背景とを別々の層にして、カメラが左右に動くように層ごとに違う量だけずらす。手前の人物は大きく、奥の部屋は少しだけ動き、1 枚の画が立体に見える。
void main() {
  float swing = sin(time * 0.8);
  vec2 back = (uv - 0.5) / 1.08 + 0.5 + vec2(swing * 0.02, 0.0);
  vec2 front = (uv - 0.5) / 1.12 + 0.5 - vec2(swing * 0.05, 0.0);
  vec3 c = plate(back);
  c = mix(c, rgb(front), matte(front));
  outColor = vec4(c, 1.0);
}
