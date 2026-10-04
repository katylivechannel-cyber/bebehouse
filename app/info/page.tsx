import Link from 'next/link'
import {
  ChevronLeft,
  CreditCard,
  FileText,
  Heart,
  Package,
  RotateCcw,
  ShieldCheck,
  Tag,
  UserRound,
} from 'lucide-react'

export default function InfoPage() {
  return (
    <main className="flex flex-col gap-6 pb-10 pt-5">
      <Link href="/" className="inline-flex w-fit items-center gap-1 text-sm text-[#6F5A4D]">
        <ChevronLeft className="h-4 w-4" />
        На главную
      </Link>

      <header>
        <p className="font-serif text-[34px] font-semibold leading-tight text-[#411D0A]">
          Покупателям
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#7A6A61]">
          Всё самое важное об оформлении заказа в bébéhouse.
        </p>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-[#EEE5DD] bg-white">
        <InfoBlock icon={<Package className="h-5 w-5" strokeWidth={1.8} />} title="Доставка">
          <p>При оформлении заказа можно выбрать удобный пункт выдачи СДЭК или Яндекс Доставки.</p>
          <p>Стоимость доставки рассчитывается автоматически для выбранного города и заказа.</p>
          <p><strong className="font-medium text-[#411D0A]">СДЭК:</strong> доставка оплачивается при получении заказа в ПВЗ.</p>
          <p><strong className="font-medium text-[#411D0A]">Яндекс Доставка:</strong> доставка оплачивается вместе с заказом при оформлении.</p>
          <p>После передачи посылки в службу доставки мы отправим информацию для отслеживания на электронную почту.</p>
        </InfoBlock>

        <InfoBlock icon={<CreditCard className="h-5 w-5" strokeWidth={1.8} />} title="Оплата">
          <p>Товары оплачиваются онлайн при оформлении заказа.</p>
          <p>После успешной оплаты на указанную электронную почту приходит подтверждение заказа.</p>
        </InfoBlock>

        <InfoBlock icon={<Tag className="h-5 w-5" strokeWidth={1.8} />} title="Цены">
          <p>Стоимость товаров в интернет-магазине указана в рублях РФ за одну единицу товара.</p>
          <p>
            Если в результате технической ошибки была указана некорректная стоимость товара,
            мы свяжемся с вами для уточнения актуальной цены и подтверждения заказа.
          </p>
          <p>Если связаться с покупателем не удаётся в течение 24 часов, заказ может быть отменён.</p>
        </InfoBlock>

        <InfoBlock icon={<RotateCcw className="h-5 w-5" strokeWidth={1.8} />} title="Возврат">
          <p>
            От товара можно отказаться в любое время до его передачи, а после получения товара
            надлежащего качества — в течение 7 дней.
          </p>
          <p>
            Для возврата товара надлежащего качества должны быть сохранены его товарный вид и
            потребительские свойства.
          </p>
          <p>
            Возврат можно отправить перевозчиком или почтой. Расходы на обратную доставку товара
            надлежащего качества оплачивает покупатель.
          </p>
          <p>
            Если товар оказался ненадлежащего качества, применяются права покупателя,
            предусмотренные законодательством РФ о защите прав потребителей.
          </p>
        </InfoBlock>

        <InfoBlock icon={<Heart className="h-5 w-5" strokeWidth={1.8} />} title="О bébéhouse">
          <p>bébéhouse — магазин детских товаров европейских брендов.</p>
          <p>
            Мы собираем в одном месте игрушки, аксессуары и красивые вещи для малышей,
            которые выбираем с особым вниманием.
          </p>
        </InfoBlock>
      </section>

      <section className="rounded-[24px] bg-[#FAF7F2] p-5">
        <h2 className="font-serif text-xl font-semibold text-[#411D0A]">
          Правовая информация
        </h2>

        <div className="mt-4 flex flex-col">
          <LegalLink href="/offer" icon={<FileText className="h-5 w-5" />} label="Публичная оферта" />
          <LegalLink href="/privacy" icon={<ShieldCheck className="h-5 w-5" />} label="Политика обработки персональных данных" />
          <LegalLink href="/personal-data-consent" icon={<UserRound className="h-5 w-5" />} label="Согласие на обработку персональных данных" />
        </div>

        <div className="mt-5 border-t border-[#E8DED6] pt-4 text-xs leading-relaxed text-[#7A6A61]">
          <p className="font-medium text-[#411D0A]">ИП Егорова Екатерина Валерьевна</p>
          <p className="mt-1">ИНН 233103046494 · ОГРНИП 325237500238812</p>
          <p className="mt-1">ekaterinaegorovaa@mail.ru · +7 961 856-09-31</p>
        </div>
      </section>

      <p className="text-center text-xs leading-relaxed text-[#9A8980]">
        bébéhouse — children&apos;s boutique 🤍
      </p>
    </main>
  )
}

function InfoBlock({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-[#EEE5DD] p-5 last:border-b-0">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F3EE] text-[#411D0A]">
          {icon}
        </div>
        <h2 className="font-serif text-xl font-semibold text-[#411D0A]">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-[#6F5A4D]">
        {children}
      </div>
    </div>
  )
}

function LegalLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-[#E8DED6] py-3 text-sm font-medium text-[#411D0A] last:border-b-0"
    >
      <span className="text-[#411D0A]">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto text-[#9A8980]">→</span>
    </Link>
  )
}
