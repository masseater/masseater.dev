// note: 画面の上下をぼかし、真ん中の帯だけにピントを残す。色を濃くしてコマを少し飛ばすと、部屋がミニチュアの模型のように見える。
void main() {
  float t = floor(time * 10.0) / 10.0;
  float r = smoothstep(0.08, 0.45, abs(uv.y - 0.6)) * 0.03;
  vec3 c = mix(rgb(uv), blurRgb(uv, r), smoothstep(0.0, 0.004, r));
  c = mix(vec3(luma(c)), c, 1.6);
  c = (c - 0.5) * 1.15 + 0.5;
  outColor = vec4(c + 0.0 * t, 1.0);
}
