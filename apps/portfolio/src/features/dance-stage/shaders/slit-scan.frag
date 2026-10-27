// note: 画面の高さごとに、さかのぼる時間を変えて並べる。下の行ほど 2 秒前までの古い瞬間が写り、動いた腕や体が縦に伸びて曲がる。
void main() {
  float delay = uv.y * 2.0;
  outColor = vec4(pastRgb(uv, time - delay), 1.0);
}
