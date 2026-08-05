-- Sprint 3, steg 4: systemkategorier. Profilfärger hanteras först efter granskad household-backfill.
insert into public.calendar_categories (household_id, name, icon, color, is_system, created_by)
select h.id, seed.name, seed.icon, seed.color, true, null
from public.households h
cross join (values ('Arbete', 'briefcase', '#2563eb'), ('Födelsedag', 'cake', '#db2777'), ('Övrigt', 'calendar', '#64748b')) seed(name, icon, color)
where h.slug = 'storhogsgatan-24'
on conflict (household_id, lower(name)) do nothing;
