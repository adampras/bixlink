-- Lightweight onboarding rules; invalid assertions fail with division by zero.
WITH checks(name,passed) AS (VALUES
 ('complete self-driver data accepted without vehicle age restriction',public.bixgo_driver_application_valid('Driver Test','+62 81234567890','Motor lama','DR 1234 AB',true)),
 ('safety declaration required',NOT public.bixgo_driver_application_valid('Driver Test','081234567890','Honda Vario','DR 1234 AB',false)),
 ('name required',NOT public.bixgo_driver_application_valid('','081234567890','Honda Vario','DR 1234 AB',true)),
 ('reachable phone format required',NOT public.bixgo_driver_application_valid('Driver Test','123','Honda Vario','DR 1234 AB',true)),
 ('vehicle model required',NOT public.bixgo_driver_application_valid('Driver Test','081234567890','','DR 1234 AB',true)),
 ('plate required',NOT public.bixgo_driver_application_valid('Driver Test','081234567890','Honda Vario','',true))
)
SELECT name,1/CASE WHEN passed THEN 1 ELSE 0 END AS passed FROM checks;