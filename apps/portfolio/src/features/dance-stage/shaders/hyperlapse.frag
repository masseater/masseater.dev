// note: 8 倍速で再生しながら、カメラが部屋の奥へ少しずつ進み、横へも滑っていくように画を動かす。動きを滑らかにならし、速回しでも揺れずに前進して見える。
void main() {
  float t = time * 8.0;
  float travel = fract(time / 7.2);
  float zoom = 1.0 + travel * 0.6;
  vec2 drift = vec2(0.08 * sin(travel * PI), 0.0);
  vec2 p = (uv - 0.5) / zoom + 0.5 + drift * (1.0 - 1.0 / zoom);
  outColor = vec4(pastRgb(p, t), 1.0);
}
