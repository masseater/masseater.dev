// note: 画面の左右で別のピントを持たせる。左は背景に、右は人物に合わせ、境目はレンズの縁のように少しにじませる。
void main() {
  float seam = smoothstep(0.47, 0.53, uv.x);
  float m = matte(uv);
  vec3 left = mix(plate(uv), blurRgb(uv, 0.02), m);
  vec3 right = mix(blurPlate(uv, 0.025), rgb(uv), m);
  vec3 c = mix(left, right, seam);
  c *= 1.0 - 0.15 * exp(-pow((uv.x - 0.5) * 40.0, 2.0));
  outColor = vec4(c, 1.0);
}
