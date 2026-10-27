// note: 踊りの画と、黒・白の無地の画を交互に出す。本来のフリッカー映画は 1 秒に十数回明滅させるが、見る人の負担を避けるため 1 秒に 2.4 回までに抑えた。
void main() {
  float slot = mod(floor(time * 2.4), 3.0);
  vec3 c = slot < 1.0 ? rgb(uv) : slot < 2.0 ? vec3(0.08) : vec3(0.92);
  outColor = vec4(c, 1.0);
}
