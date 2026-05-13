-- AddForeignKey
ALTER TABLE "class_holidays" ADD CONSTRAINT "class_holidays_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
