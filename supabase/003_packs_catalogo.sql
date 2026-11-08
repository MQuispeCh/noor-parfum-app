-- Noor Parfum · packs de regalo y catálogo público
-- Ejecutar una vez en Supabase › SQL Editor (después de 002).

-- 1) Packs de regalo de la campaña navideña (se pueden editar o borrar desde la app)
insert into public.productos (id, data) values
  ('PK01', '{"codigo": "PK01", "nombre": "Pack Él Fresco", "marca": "Noor Parfum", "categoria": "Pack", "para": "Varones", "ml": 0, "precio": 189, "stockMin": 0, "descripcion": "Hawas Ice + body spray Z7. Fresco y elegante, listo para regalar.", "componentes": [{"codigo": "P05", "cant": 1}, {"codigo": "P20", "cant": 1}]}'::jsonb),
  ('PK02', '{"codigo": "PK02", "nombre": "Pack Él Intenso", "marca": "Noor Parfum", "categoria": "Pack", "para": "Varones", "ml": 0, "precio": 209, "stockMin": 0, "descripcion": "Hawas For Him + body spray Z25. El Hawas más pedido con su compañero.", "componentes": [{"codigo": "P06", "cant": 1}, {"codigo": "P23", "cant": 1}]}'::jsonb),
  ('PK03', '{"codigo": "PK03", "nombre": "Pack Él Clásico", "marca": "Noor Parfum", "categoria": "Pack", "para": "Varones", "ml": 0, "precio": 149, "stockMin": 0, "descripcion": "Avant + body spray Z25. Especiado y elegante.", "componentes": [{"codigo": "P18", "cant": 1}, {"codigo": "P23", "cant": 1}]}'::jsonb),
  ('PK04', '{"codigo": "PK04", "nombre": "Pack Ella Dulce", "marca": "Noor Parfum", "categoria": "Pack", "para": "Damas", "ml": 0, "precio": 199, "stockMin": 0, "descripcion": "Sugar Rush Sprinkle Joy + body spray Z19. Para las que aman lo dulce.", "componentes": [{"codigo": "P01", "cant": 1}, {"codigo": "P24", "cant": 1}]}'::jsonb),
  ('PK05', '{"codigo": "PK05", "nombre": "Pack Ella Elegante", "marca": "Noor Parfum", "categoria": "Pack", "para": "Damas", "ml": 0, "precio": 149, "stockMin": 0, "descripcion": "Royale Rubinia + body spray Z22. Frutal y cremoso.", "componentes": [{"codigo": "P08", "cant": 1}, {"codigo": "P21", "cant": 1}]}'::jsonb),
  ('PK06', '{"codigo": "PK06", "nombre": "Pack Ella Floral", "marca": "Noor Parfum", "categoria": "Pack", "para": "Damas", "ml": 0, "precio": 139, "stockMin": 0, "descripcion": "Pure Gold + body spray Z9. Rosa y vainilla cálidas.", "componentes": [{"codigo": "P16", "cant": 1}, {"codigo": "P22", "cant": 1}]}'::jsonb),
  ('PK07', '{"codigo": "PK07", "nombre": "Dúo Qamarain", "marca": "Noor Parfum", "categoria": "Pack", "para": "Unisex", "ml": 0, "precio": 458, "stockMin": 0, "descripcion": "Qamarain For Him + For Her + body spray Z9 de regalo. El regalo para la pareja.", "componentes": [{"codigo": "P04", "cant": 1}, {"codigo": "P03", "cant": 1}, {"codigo": "P22", "cant": 1}]}'::jsonb),
  ('PK08', '{"codigo": "PK08", "nombre": "Detalle Mango", "marca": "Noor Parfum", "categoria": "Pack", "para": "Unisex", "ml": 0, "precio": 99, "stockMin": 0, "descripcion": "Tubbees Sweet Mango Melody + body spray Z9. Un detalle dulce.", "componentes": [{"codigo": "P26", "cant": 1}, {"codigo": "P22", "cant": 1}]}'::jsonb),
  ('PK09', '{"codigo": "PK09", "nombre": "Detalle Esraa", "marca": "Noor Parfum", "categoria": "Pack", "para": "Unisex", "ml": 0, "precio": 99, "stockMin": 0, "descripcion": "Aceite Esraa de Lattafa + body spray Z19. Pequeño y duradero.", "componentes": [{"codigo": "P25", "cant": 1}, {"codigo": "P24", "cant": 1}]}'::jsonb)
on conflict (id) do nothing;

-- 2) Catálogo público: nombre, precio y unidades disponibles. No expone costos, ventas ni clientes.
create or replace function public.catalogo_publico()
returns table (id text, data jsonb, disponible int)
language sql stable security definer set search_path = public as $$
  with entra as (
    select i->>'codigo' as cod, sum((i->>'cant')::numeric) as q
    from public.compras, jsonb_array_elements(data->'items') i group by 1
  ), sale as (
    select data->>'codigo' as cod,
           sum(case when data->>'tipo' = 'Devolución' then -(data->>'cant')::numeric else (data->>'cant')::numeric end) as q
    from public.movimientos group by 1
  ), aparta as (
    select data->>'codigo' as cod, sum((data->>'cant')::numeric) as q
    from public.separados where data->>'estado' = 'Apartado' group by 1
  )
  select p.id,
         jsonb_build_object('nombre', p.data->'nombre', 'marca', p.data->'marca', 'categoria', p.data->'categoria',
                            'para', p.data->'para', 'ml', p.data->'ml', 'precio', p.data->'precio',
                            'descripcion', p.data->'descripcion', 'componentes', p.data->'componentes'),
         (coalesce(e.q,0) - coalesce(s.q,0) - coalesce(a.q,0))::int
  from public.productos p
  left join entra e on e.cod = p.id
  left join sale s on s.cod = p.id
  left join aparta a on a.cod = p.id;
$$;
revoke all on function public.catalogo_publico() from public;
grant execute on function public.catalogo_publico() to anon, authenticated;
