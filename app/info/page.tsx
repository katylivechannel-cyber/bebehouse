import Link from 'next/link'
import {
  ChevronLeft,
  CreditCard,
  Heart,
  Package,
  RotateCcw,
  Tag,
} from 'lucide-react'

export default function InfoPage() {
  return (
    <main className="flex flex-col gap-6 pb-10 pt-5">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-[#6F5A4D]"
      >
        <ChevronLeft className="h-4 w-4" />
        На главную
      </Link>

      <header>
        <p className="font-serif text-[34px] font-semibold leading-tight text-[#411D0A]">
          Покупателям
        </p>

        <p className="mt-2 text-sm leading-relaxed text-[#7A6A61]">
          Всё самое важное об оформлении заказа
          в bébéhouse.
        </p>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-[#EEE5DD] bg-white">
        <div className="border-b border-[#EEE5DD] p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F3EE]">
              <Package
                className="h-5 w-5 text-[#411D0A]"
                strokeWidth={1.8}
              />
            </div>

            <h2 className="font-serif text-xl font-semibold text-[#411D0A]">
              Доставка
            </h2>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[#6F5A4D]">
            <p>
              При оформлении заказа можно выбрать
              удобный пункт выдачи СДЭК или Яндекс
              Доставки.
            </p>

            <p>
              Стоимость доставки рассчитывается
              автоматически для выбранного города
              и заказа.
            </p>

            <p>
              <strong className="font-medium text-[#411D0A]">
                СДЭК:
              </strong>{' '}
              доставка оплачивается при получении
              заказа в ПВЗ.
            </p>

            <p>
              <strong className="font-medium text-[#411D0A]">
                Яндекс Доставка:
              </strong>{' '}
              доставка оплачивается вместе с
              заказом при оформлении.
            </p>

            <p>
              После передачи посылки в службу
              доставки мы отправим информацию для
              отслеживания на электронную почту.
            </p>
          </div>
        </div>

        <div className="border-b border-[#EEE5DD] p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F3EE]">
              <CreditCard
                className="h-5 w-5 text-[#411D0A]"
                strokeWidth={1.8}
              />
            </div>

            <h2 className="font-serif text-xl font-semibold text-[#411D0A]">
              Оплата
            </h2>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[#6F5A4D]">
            <p>
              Товары оплачиваются онлайн при
              оформлении заказа.
            </p>

            <p>
              После успешной оплаты на указанную
              электронную почту приходит
              подтверждение заказа.
            </p>
          </div>
        </div>

        <div className="border-b border-[#EEE5DD] p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F3EE]">
              <Tag
                className="h-5 w-5 text-[#411D0A]"
                strokeWidth={1.8}
              />
            </div>

            <h2 className="font-serif text-xl font-semibold text-[#411D0A]">
              Цены
            </h2>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[#6F5A4D]">
            <p>
              Стоимость товаров в интернет-магазине
              указана в рублях РФ за одну единицу
              товара.
            </p>

            <p>
              Если в результате технической ошибки
              на сайте была указана некорректная
              стоимость товара, мы свяжемся с вами
              для уточнения актуальной цены и
              подтверждения заказа.
            </p>

            <p>
              Если связаться с покупателем не
              удаётся в течение 24 часов, заказ
              может быть отменён.
            </p>
          </div>
        </div>

        <div className="border-b border-[#EEE5DD] p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F3EE]">
              <RotateCcw
                className="h-5 w-5 text-[#411D0A]"
                strokeWidth={1.8}
              />
            </div>

            <h2 className="font-serif text-xl font-semibold text-[#411D0A]">
              Возврат
            </h2>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[#6F5A4D]">
            <p>
              Вы можете оформить возврат товара в
              течение 14 дней с момента получения,
              если товар не был в использовании,
              сохранил первоначальный товарный вид
              и потребительские свойства, а также
              оригинальную упаковку и ярлыки.
            </p>

            <p>
              Расходы, связанные с обратной
              отправкой товара — в том числе услуги
              курьера, почты или транспортной
              службы — оплачивает покупатель.
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4E9A6]">
              <Heart
                className="h-5 w-5 text-[#411D0A]"
                strokeWidth={1.8}
              />
            </div>

            <h2 className="font-serif text-xl font-semibold text-[#411D0A]">
              О bébéhouse
            </h2>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-[#6F5A4D]">
            <p>
              bébéhouse — магазин детских товаров
              европейских брендов.
            </p>

            <p>
              Мы собираем в одном месте игрушки,
              аксессуары и красивые вещи для
              малышей, которые выбираем с особым
              вниманием.
            </p>
          </div>
        </div>
      </section>

      <p className="text-center text-xs leading-relaxed text-[#9A8980]">
        bébéhouse — children&apos;s boutique 🤍
      </p>
    </main>
  )
}
