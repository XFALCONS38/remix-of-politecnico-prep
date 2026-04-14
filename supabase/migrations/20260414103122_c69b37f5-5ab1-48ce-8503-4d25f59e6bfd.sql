
DELETE FROM public.questions a USING public.questions b
WHERE a.set_id = 'SET_03' AND b.set_id = 'SET_03'
  AND a.question_code = b.question_code AND a.section = b.section
  AND a.ctid > b.ctid;
