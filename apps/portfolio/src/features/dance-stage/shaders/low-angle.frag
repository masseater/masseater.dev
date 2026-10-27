// note: 画の下側を横に広げ、上側をすぼめて、床すれすれから見上げたような遠近にする。人物が大きくそびえて見える。
void main() {
  float y = uv.y;
  float spread = mix(0.62, 1.18, y);
  vec2 p = vec2((uv.x - 0.5) * spread + 0.5, pow(y, 1.25) * 0.95 + 0.04);
  outColor = vec4(rgbOr(p, vec3(0.05)), 1.0);
}
