// note: 4 分の 1 の円弧を描いたタイルを、向きだけでたらめに変えて敷き詰め、つながった波の道を作る。弧の帯の中にだけ踊りの映像を通し、タイルの向きは拍ごとに少しずつ入れ替わる。
void main() {
  vec2 q = uv * vec2(aspect(), 1.0) * 12.0;
  vec2 cell = floor(q);
  vec2 f = fract(q);
  if (hash(cell + floor(beatCount / 2.0) * step(0.9, hash(cell + 3.0))) > 0.5) f.x = 1.0 - f.x;
  float d = min(abs(length(f) - 0.5), abs(length(f - 1.0) - 0.5));
  float band = smoothstep(0.17, 0.14, d);
  vec3 c = mix(vec3(0.1, 0.1, 0.14), rgb(uv), band);
  c = mix(c, vec3(0.95), smoothstep(0.02, 0.0, abs(d - 0.16)));
  outColor = vec4(c, 1.0);
}
