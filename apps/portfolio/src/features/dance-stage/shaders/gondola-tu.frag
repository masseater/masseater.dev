// note: 人物の大きさは変えず、後ろの部屋だけをゆっくり寄せていく。背景だけが迫ってくるので、人物の気持ちが張り詰めていくように見える。
void main() {
  float zoom = 1.0 + fract(time / 6.0) * 0.8;
  vec2 back = (uv - bodyCenter()) / zoom + bodyCenter();
  vec3 c = plate(back);
  c = mix(c, rgb(uv), matte(uv));
  outColor = vec4(c, 1.0);
}
