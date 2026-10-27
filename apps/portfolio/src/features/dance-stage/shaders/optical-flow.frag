// note: 今のフレームと少し前のフレームの明るさの差から画素ごとの動きの向きを求め、向きを色相、速さを明るさにした色で塗る。動いている腕や脚だけが色づき、止まった壁は暗いまま残る。
void main() {
  float dt = 1.0 / 15.0;
  vec2 e = vec2(2.0 / resolution.x, 2.0 / resolution.y) * 2.0;
  float now = luma(blurRgb(uv, 0.004));
  float before = luma(pastRgb(uv, time - dt));
  float gx = luma(rgb(uv + vec2(e.x, 0.0))) - luma(rgb(uv - vec2(e.x, 0.0)));
  float gy = luma(rgb(uv + vec2(0.0, e.y))) - luma(rgb(uv - vec2(0.0, e.y)));
  float it = now - before;
  vec2 grad = vec2(gx, gy);
  vec2 v = -it * grad / (dot(grad, grad) + 0.002);
  float mag = clamp(length(v) * 4.0, 0.0, 1.0);
  float hue = atan(v.y, v.x) / (2.0 * PI) + 0.5;
  vec3 flowColor = hsv(vec3(hue, 0.9, mag));
  vec3 c = rgb(uv) * 0.2 + flowColor;
  outColor = vec4(c, 1.0);
}
