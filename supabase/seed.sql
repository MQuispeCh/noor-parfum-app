-- Noor Parfum · datos iniciales (copiados del Excel al 07/11/2026)
-- Ejecutar después de schema.sql. Dueños ya configurados.

insert into public.duenos (email, nombre) values
  ('mq77357@gmail.com', 'Jesús')
  -- Para agregar a tu socio, cambia la línea de arriba por:
  -- ('mq77357@gmail.com', 'Jesús'), ('CORREO-DEL-SOCIO', 'Nombre del socio')
on conflict (email) do update set nombre = excluded.nombre;

insert into public.productos (id, data) values
  ('P01', '{"codigo": "P01", "nombre": "Sugar Rush – Sprinkle Joy", "marca": "Amaran", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 169, "stockMin": 1}'::jsonb),
  ('P02', '{"codigo": "P02", "nombre": "Sugar Rush – Sweetness Overload", "marca": "Amaran", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 169, "stockMin": 1}'::jsonb),
  ('P03', '{"codigo": "P03", "nombre": "Qamarain For Her", "marca": "Amaran", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 229, "stockMin": 1}'::jsonb),
  ('P04', '{"codigo": "P04", "nombre": "Qamarain For Him", "marca": "Amaran", "categoria": "Perfume", "para": "Varones", "ml": 100, "precio": 229, "stockMin": 1}'::jsonb),
  ('P05', '{"codigo": "P05", "nombre": "Hawas Ice", "marca": "Rasasi", "categoria": "Perfume", "para": "Varones", "ml": 100, "precio": 159, "stockMin": 1}'::jsonb),
  ('P06', '{"codigo": "P06", "nombre": "Hawas For Him", "marca": "Rasasi", "categoria": "Perfume", "para": "Varones", "ml": 100, "precio": 179, "stockMin": 1}'::jsonb),
  ('P07', '{"codigo": "P07", "nombre": "Profumo Intensity – Collector''s Edition", "marca": "Vurv", "categoria": "Perfume", "para": "Varones", "ml": 100, "precio": 119, "stockMin": 1}'::jsonb),
  ('P08', '{"codigo": "P08", "nombre": "Royale Rubinia", "marca": "Zakat", "categoria": "Perfume", "para": "Damas", "ml": 80, "precio": 119, "stockMin": 1}'::jsonb),
  ('P09', '{"codigo": "P09", "nombre": "Umm Al Quwain (Jewels of Emirates)", "marca": "Zakat", "categoria": "Perfume", "para": "Unisex", "ml": 100, "precio": 119, "stockMin": 1}'::jsonb),
  ('P10', '{"codigo": "P10", "nombre": "Vani Landia", "marca": "Zakat Creations", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 169, "stockMin": 1}'::jsonb),
  ('P11', '{"codigo": "P11", "nombre": "Gummy Landia", "marca": "Zakat Creations", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 169, "stockMin": 1}'::jsonb),
  ('P12', '{"codigo": "P12", "nombre": "Crystal Garnate", "marca": "Zakat", "categoria": "Perfume", "para": "Damas", "ml": 115, "precio": 119, "stockMin": 1}'::jsonb),
  ('P13', '{"codigo": "P13", "nombre": "Crystal Aurum", "marca": "Zakat", "categoria": "Perfume", "para": "Unisex", "ml": 115, "precio": 119, "stockMin": 1}'::jsonb),
  ('P14', '{"codigo": "P14", "nombre": "Al Awwal Nisae (caja blanca)", "marca": "Zakat", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 119, "stockMin": 1}'::jsonb),
  ('P15', '{"codigo": "P15", "nombre": "Al Awwal Malaki Rojo (caja roja)", "marca": "Zakat", "categoria": "Perfume", "para": "Unisex", "ml": 100, "precio": 119, "stockMin": 1}'::jsonb),
  ('P16', '{"codigo": "P16", "nombre": "Pure Gold", "marca": "Zakat", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 119, "stockMin": 1}'::jsonb),
  ('P17', '{"codigo": "P17", "nombre": "Lé Gemme Rosy", "marca": "Zakat", "categoria": "Perfume", "para": "Damas", "ml": 115, "precio": 129, "stockMin": 1}'::jsonb),
  ('P18', '{"codigo": "P18", "nombre": "Avant", "marca": "Zakat", "categoria": "Perfume", "para": "Varones", "ml": 100, "precio": 129, "stockMin": 1}'::jsonb),
  ('P19', '{"codigo": "P19", "nombre": "Ghazal Edge", "marca": "Zakat", "categoria": "Perfume", "para": "Damas", "ml": 100, "precio": 129, "stockMin": 1}'::jsonb),
  ('P20', '{"codigo": "P20", "nombre": "Body Spray Z7", "marca": "Zakat", "categoria": "Body spray", "para": "Unisex", "ml": 200, "precio": 49, "stockMin": 1}'::jsonb),
  ('P21', '{"codigo": "P21", "nombre": "Body Spray Z22", "marca": "Zakat", "categoria": "Body spray", "para": "Damas", "ml": 200, "precio": 49, "stockMin": 1}'::jsonb),
  ('P22', '{"codigo": "P22", "nombre": "Body Spray Z9", "marca": "Zakat", "categoria": "Body spray", "para": "Damas", "ml": 200, "precio": 49, "stockMin": 1}'::jsonb),
  ('P23', '{"codigo": "P23", "nombre": "Body Spray Z25", "marca": "Zakat", "categoria": "Body spray", "para": "Unisex", "ml": 200, "precio": 49, "stockMin": 1}'::jsonb),
  ('P24', '{"codigo": "P24", "nombre": "Body Spray Z19", "marca": "Zakat", "categoria": "Body spray", "para": "Damas", "ml": 200, "precio": 49, "stockMin": 1}'::jsonb),
  ('P25', '{"codigo": "P25", "nombre": "Esraa de Lattafa", "marca": "Lattafa", "categoria": "Perfume", "para": "Unisex", "ml": 20, "precio": 79, "stockMin": 1}'::jsonb),
  ('P26', '{"codigo": "P26", "nombre": "Tubbees Sweet Mango Melody", "marca": "Grandeur", "categoria": "Perfume", "para": "Unisex", "ml": 50, "precio": 79, "stockMin": 1}'::jsonb),
  ('P27', '{"codigo": "P27", "nombre": "Set The Kingdom Hombre (EDP 100 ml + mini + gel)", "marca": "Lattafa", "categoria": "Set", "para": "Varones", "ml": 100, "precio": 199, "stockMin": 1}'::jsonb),
  ('P28', '{"codigo": "P28", "nombre": "Set Asad (EDP 100 ml + spray 200 ml)", "marca": "Lattafa", "categoria": "Set", "para": "Varones", "ml": 100, "precio": 189, "stockMin": 1}'::jsonb),
  ('P29', '{"codigo": "P29", "nombre": "Set 9 AM Dive (EDP 100 ml + gel + desodorante)", "marca": "Afnan", "categoria": "Set", "para": "Varones", "ml": 100, "precio": 199, "stockMin": 1}'::jsonb)
on conflict (id) do nothing;

insert into public.compras (id, data) values
  ('C01', '{"nombre": "Pack 1", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 349, "envio": 0, "items": [{"codigo": "P09", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P13", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P06", "cant": 1, "regalo": false, "precioRef": 179}, {"codigo": "P05", "cant": 1, "regalo": false, "precioRef": 159}], "creado": 1}'::jsonb),
  ('C02', '{"nombre": "Pack 2", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 349, "envio": 0, "items": [{"codigo": "P05", "cant": 1, "regalo": false, "precioRef": 159}, {"codigo": "P06", "cant": 1, "regalo": false, "precioRef": 179}, {"codigo": "P19", "cant": 1, "regalo": false, "precioRef": 129}, {"codigo": "P15", "cant": 1, "regalo": false, "precioRef": 119}], "creado": 2}'::jsonb),
  ('C03', '{"nombre": "Pack 3", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 349, "envio": 0, "items": [{"codigo": "P08", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P06", "cant": 1, "regalo": false, "precioRef": 179}, {"codigo": "P05", "cant": 1, "regalo": false, "precioRef": 159}, {"codigo": "P17", "cant": 1, "regalo": false, "precioRef": 129}], "creado": 3}'::jsonb),
  ('C04', '{"nombre": "Pack 10", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 350, "envio": 0, "items": [{"codigo": "P18", "cant": 1, "regalo": false, "precioRef": 129}, {"codigo": "P13", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P12", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P14", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P08", "cant": 1, "regalo": false, "precioRef": 119}], "creado": 4}'::jsonb),
  ('C05', '{"nombre": "Pack Pastelero", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 399, "envio": 10, "items": [{"codigo": "P01", "cant": 1, "regalo": false, "precioRef": 169}, {"codigo": "P02", "cant": 1, "regalo": false, "precioRef": 169}, {"codigo": "P10", "cant": 1, "regalo": false, "precioRef": 169}, {"codigo": "P11", "cant": 1, "regalo": false, "precioRef": 169}], "creado": 5}'::jsonb),
  ('C06', '{"nombre": "Pack 4 x S/199", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 199, "envio": 14, "items": [{"codigo": "P16", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P13", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P18", "cant": 1, "regalo": false, "precioRef": 129}, {"codigo": "P07", "cant": 1, "regalo": false, "precioRef": 119}], "creado": 6}'::jsonb),
  ('C07', '{"nombre": "Qamarain x4", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 636, "envio": 10, "items": [{"codigo": "P04", "cant": 2, "regalo": false, "precioRef": 229}, {"codigo": "P03", "cant": 2, "regalo": false, "precioRef": 229}], "creado": 7}'::jsonb),
  ('C08', '{"nombre": "Regalos body spray", "fecha": "2026-10-08", "proveedor": "United Perfumes", "monto": 0, "envio": 0, "items": [{"codigo": "P20", "cant": 2, "regalo": true, "precioRef": 49}, {"codigo": "P21", "cant": 2, "regalo": true, "precioRef": 49}, {"codigo": "P22", "cant": 5, "regalo": true, "precioRef": 49}, {"codigo": "P23", "cant": 3, "regalo": true, "precioRef": 49}, {"codigo": "P24", "cant": 3, "regalo": true, "precioRef": 49}], "creado": 8}'::jsonb),
  ('C09', '{"nombre": "Compra 08-10-2026", "fecha": "2026-10-08", "proveedor": "Otro proveedor", "monto": 299, "envio": 20, "items": [{"codigo": "P23", "cant": 1, "regalo": true, "precioRef": 49}, {"codigo": "P22", "cant": 1, "regalo": true, "precioRef": 49}, {"codigo": "P24", "cant": 1, "regalo": true, "precioRef": 49}, {"codigo": "P21", "cant": 1, "regalo": true, "precioRef": 49}, {"codigo": "P08", "cant": 1, "regalo": false, "precioRef": 119}, {"codigo": "P01", "cant": 1, "regalo": false, "precioRef": 169}, {"codigo": "P25", "cant": 1, "regalo": false, "precioRef": 79}, {"codigo": "P26", "cant": 1, "regalo": false, "precioRef": 79}], "creado": 9}'::jsonb)
on conflict (id) do nothing;

insert into public.movimientos (id, data) values
  ('M0001', '{"fecha": "2026-10-08", "tipo": "Venta", "codigo": "P09", "cant": 1, "precio": 119, "descuento": 0, "total": 119, "costoUnit": 72.1, "cliente": "Juan Manuel Abanto Diaz", "canal": "WhatsApp", "pago": "Plin", "pagado": 119, "notas": "Deposito plin al 952894623", "creado": 1, "por": null, "abonos": []}'::jsonb),
  ('M0002', '{"fecha": "2026-11-01", "tipo": "Venta", "codigo": "P13", "cant": 1, "precio": 119, "descuento": 0, "total": 119, "costoUnit": 64.37, "cliente": "Andres Chapoñan de la Cruz", "canal": "Tienda / en persona", "pago": "Crédito", "pagado": 0, "notas": "A credito, debe la totalidad", "creado": 2, "por": null, "abonos": []}'::jsonb),
  ('M0003', '{"fecha": "2026-11-06", "tipo": "Venta", "codigo": "P18", "cant": 1, "precio": 129, "descuento": 0, "total": 129, "costoUnit": 65.58, "cliente": "Andres Chapoñan de la Cruz", "canal": "Tienda / en persona", "pago": "Crédito", "pagado": 0, "notas": "A credito, debe la totalidad", "creado": 3, "por": null, "abonos": []}'::jsonb),
  ('M0004', '{"fecha": "2026-11-06", "tipo": "Venta", "codigo": "P15", "cant": 1, "precio": 119, "descuento": 0, "total": 119, "costoUnit": 70.87, "cliente": "Andres Chapoñan de la Cruz", "canal": "Tienda / en persona", "pago": "Crédito", "pagado": 0, "notas": "A credito, debe la totalidad", "creado": 4, "por": null, "abonos": []}'::jsonb),
  ('M0005', '{"fecha": "2026-11-06", "tipo": "Obsequio", "codigo": "P23", "cant": 1, "precio": 49, "descuento": 0, "total": 0, "costoUnit": 0, "cliente": "Randal Abanto", "canal": "Tienda / en persona", "pago": "Efectivo", "pagado": 0, "notas": "Regalo por promocion de la pagina", "creado": 5, "por": null, "abonos": []}'::jsonb)
on conflict (id) do nothing;
