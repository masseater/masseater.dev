// note: 人物の切り抜きを手前、部屋を奥とみなし、左目の像を赤、右目の像を青緑にずらして重ねる。赤青の眼鏡で見ると、踊る人が画面から浮いて見える。
void main() {
  float depth = matte(uv);
  float shift = 0.006 + depth * 0.012;
  vec3 left = rgb(uv + vec2(shift, 0.0));
  vec3 right = rgb(uv - vec2(shift, 0.0));
  float ml = matte(uv + vec2(shift, 0.0));
  float mr = matte(uv - vec2(shift, 0.0));
  left = mix(rgb(uv + vec2(0.006, 0.0)), left, ml);
  right = mix(rgb(uv - vec2(0.006, 0.0)), right, mr);
  vec3 c = vec3(luma(left), luma(right), luma(right));
  outColor = vec4(c, 1.0);
}
