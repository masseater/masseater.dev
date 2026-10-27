// note: 人物の横の動きにカメラを合わせて動かす。人物は画面の中ほどに保たれ、背景のほうが流れていく。
void main() {
  float x = bodyCenter().x;
  vec2 p = (uv - 0.5) / 1.6 + vec2(x, 0.55);
  outColor = vec4(rgbOr(p, vec3(0.1)), 1.0);
}
