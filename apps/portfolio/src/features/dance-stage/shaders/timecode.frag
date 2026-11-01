// note: 曲の再生位置を時:分:秒:コマの数字で上に出し、下の時間軸に 3.6 秒おきの合図を並べる。再生線が合図を越えるたびに照明の色が決まった順に変わるので、何度流しても同じ所で同じ色になる。
void main() {
  float t = mod(time, 28.8);
  float cue = floor(t / 3.6);
  vec3 light = hsv(vec3(fract(cue * 0.137 + 0.05), 0.55, 1.0));
  vec3 c = rgb(uv) * mix(vec3(1.0), light, 0.55);
  if (uv.y < 0.13) {
    c = vec3(0.04);
    float sec = floor(t);
    float fr = floor(fract(t) * 30.0);
    float h = 0.08;
    float x0 = 0.5 - 4.4 * h * 0.55 / aspect();
    float digitW = h * 0.55 / aspect();
    float on = 0.0;
    on += number(uv, vec2(x0, 0.025), h, 0.0, 2);
    on += number(uv, vec2(x0 + digitW * 2.6, 0.025), h, 0.0, 2);
    on += number(uv, vec2(x0 + digitW * 5.2, 0.025), h, sec, 2);
    on += number(uv, vec2(x0 + digitW * 7.8, 0.025), h, fr, 2);
    for (int i = 1; i <= 3; i++) {
      float cx = x0 + digitW * (2.6 * float(i) - 0.3);
      on += step(dist(uv, vec2(cx, 0.045)), 0.006) + step(dist(uv, vec2(cx, 0.085)), 0.006);
    }
    c = mix(c, vec3(1.0, 0.35, 0.25), min(on, 1.0));
  }
  if (uv.y > 0.9) {
    c = vec3(0.1);
    float x = uv.x * 28.8;
    float mark = step(fract(x / 3.6), 0.012 * 28.8 / 3.6 * 0.3);
    vec3 cueColor = hsv(vec3(fract(floor(x / 3.6) * 0.137 + 0.05), 0.55, 0.8));
    c = mix(c, cueColor, step(0.93, uv.y) * step(uv.y, 0.97) * 0.8);
    c = mix(c, vec3(1.0), mark);
    c = mix(c, vec3(1.0, 0.2, 0.2), step(abs(uv.x - t / 28.8) * aspect(), 0.003));
  }
  outColor = vec4(c, 1.0);
}
