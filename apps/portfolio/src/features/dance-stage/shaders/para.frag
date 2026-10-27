// note: 色の付いた透明な紙をカメラの前にかざしたように、左上から右下へ紫から橙へ変わる薄い色の影を全体にかける。
void main() {
  vec3 c = rgb(uv);
  float t = clamp(dot(uv, vec2(0.6, 0.8)), 0.0, 1.0);
  vec3 sheet = mix(vec3(0.6, 0.45, 0.95), vec3(1.0, 0.7, 0.45), t);
  c *= mix(vec3(1.0), sheet, 0.6);
  outColor = vec4(c, 1.0);
}
