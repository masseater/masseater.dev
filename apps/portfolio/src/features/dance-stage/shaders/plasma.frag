// note: いくつもの波を足し合わせた値で色相を回す虹色のゆらめきを作り、踊る人の形の中にだけ流し込む。外側は暗く沈める。
void main() {
  vec2 p = uv * vec2(aspect(), 1.0) * 6.0;
  float v = sin(p.x + time) + sin(p.y * 1.3 + time * 1.2) + sin((p.x + p.y) * 0.8 + time * 0.7) + sin(length(p - 3.0) * 1.5 - time);
  vec3 plasma = hsv(vec3(fract(v * 0.15 + time * 0.05), 0.8, 1.0));
  vec3 c = mix(plate(uv) * 0.15, plasma * (0.5 + 0.5 * luma(rgb(uv)) * 1.2), matte(uv));
  outColor = vec4(c, 1.0);
}
