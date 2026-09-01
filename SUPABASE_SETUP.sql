-- ════════════════════════════════════════════════════════════
-- Función atómica para obtener el siguiente número de recibo
-- Esto evita que dos ventas/compras/cotizaciones simultáneas
-- obtengan el mismo número
-- ════════════════════════════════════════════════════════════

create or replace function get_next_counter(counter_name text)
returns integer
language plpgsql
as $$
declare
  next_val integer;
begin
  if counter_name = 'receipt' then
    update config set receipt_counter = receipt_counter + 1 where id = 'main'
    returning receipt_counter - 1 into next_val;
  elsif counter_name = 'purchase' then
    update config set purchase_counter = purchase_counter + 1 where id = 'main'
    returning purchase_counter - 1 into next_val;
  elsif counter_name = 'quote' then
    update config set quote_counter = quote_counter + 1 where id = 'main'
    returning quote_counter - 1 into next_val;
  end if;
  return next_val;
end;
$$;
