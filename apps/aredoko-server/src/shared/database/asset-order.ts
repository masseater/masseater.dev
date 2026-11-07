const ASSET_ORDER = `case a.kind when 'model' then 0 when 'prefab' then 1 when 'material' then 2
    when 'audio' then 3 when 'texture' then 4 else 5 end,
  a.package_id desc, a.pathname`;

export { ASSET_ORDER };
