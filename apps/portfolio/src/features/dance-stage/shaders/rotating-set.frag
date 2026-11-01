// note: 部屋とカメラを一緒に回したように、背景は止めたまま人物だけを胴の中心のまわりで回す。床が壁になったように見える。
void main() {
  vec2 center = bodyCenter();
  float a = 0.9 * sin(time * 0.5);
  vec2 q = rot((uv - center) * vec2(aspect(), 1.0), a) / vec2(aspect(), 1.0) + center;
  vec3 c = mix(plate(uv), rgb(q), matte(q) * inside(q));
  outColor = vec4(c, 1.0);
}
