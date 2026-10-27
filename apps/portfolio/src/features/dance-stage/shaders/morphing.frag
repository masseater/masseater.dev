// note: 今の画と 1.5 秒前の画を、混ぜるだけでなく、それぞれの絵を相手の位置へ少しずつ引き寄せながら移り変わらせる。体の形がゆがみながら次の姿へ変わる。
void main() {
  float k = 0.5 - 0.5 * cos(time * 0.8);
  vec2 warp = vec2(fbm(uv * 4.0 + 3.0) - 0.5, fbm(uv * 4.0 + 9.0) - 0.5) * 0.08;
  vec3 a = rgb(uv + warp * k);
  vec3 b = pastRgb(uv - warp * (1.0 - k), time - 1.5);
  outColor = vec4(mix(a, b, smoothstep(0.2, 0.8, k)), 1.0);
}
