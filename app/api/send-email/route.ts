import { NextResponse } from "next/server";
import { Resend } from "resend";

interface Address {
  street?: string;
  complement?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

interface OrderItemOptions {
  formule?: string;
  finition?: string;
  categories?: string[];

  giftCard?: boolean;
  amount?: number | string;
  deliveryType?: "virtual" | "physical";
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  message?: string;
  shippingAddress?: Address;

  [key: string]: unknown;
}

interface OrderItem {
  id?: string;
  name?: string;
  price: number;
  quantity: number;
  options?: OrderItemOptions | null;
}

interface OrderDetails {
  id: string;
  clientName?: string;

  total?: number | string;
  subtotal?: number | string;

  discountApplied?: number;
  giftCardAmount?: number;

  carrier?: string;
  trackingNumber?: string;

  items?: OrderItem[];

  address?: Address;
}

interface GiftCardDetails {
  senderName: string;
  recipientName: string;
  amount: number | string;
  message?: string;
  code: string;
}

interface OrderConfirmationRequest {
  type: "ORDER_CONFIRMATION";
  email: string;
  orderDetails: OrderDetails;
}

interface ShippingNotificationRequest {
  type: "SHIPPING_NOTIF";
  email: string;
  orderDetails: OrderDetails;
}

interface GiftCardDeliveryRequest {
  type: "GIFT_CARD_DELIVERY";
  email: string;
  giftCard: GiftCardDetails;
}

type EmailRequest =
  | OrderConfirmationRequest
  | ShippingNotificationRequest
  | GiftCardDeliveryRequest;

const escapeHtml = (
  value: unknown,
): string => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatPrice = (
  value: number | string | undefined,
): string => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0.00 €";
  }

  return `${amount.toFixed(2)} €`;
};

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object"
    && value !== null
  );
};

const isOrderDetails = (
  value: unknown,
): value is OrderDetails => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string";
};

const isGiftCardDetails = (
  value: unknown,
): value is GiftCardDetails => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.senderName
      === "string"
    && typeof value.recipientName
      === "string"
    && (
      typeof value.amount
        === "number"
      || typeof value.amount
        === "string"
    )
    && typeof value.code
      === "string"
  );
};

const isEmailRequest = (
  value: unknown,
): value is EmailRequest => {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.email
      !== "string"
  ) {
    return false;
  }

  if (
    value.type
      === "ORDER_CONFIRMATION"
    || value.type
      === "SHIPPING_NOTIF"
  ) {
    return isOrderDetails(
      value.orderDetails,
    );
  }

  if (
    value.type
      === "GIFT_CARD_DELIVERY"
  ) {
    return isGiftCardDetails(
      value.giftCard,
    );
  }

  return false;
};

const renderOrderOptions = (
  options?: OrderItemOptions | null,
): string => {
  if (!options) {
    return "";
  }

  const rows: string[] = [];

  if (options.formule) {
    rows.push(`
      <div>
        <strong>Formule :</strong>
        ${escapeHtml(options.formule)}
      </div>
    `);
  }

  if (options.finition) {
    rows.push(`
      <div>
        <strong>Finition :</strong>
        ${escapeHtml(options.finition)}
      </div>
    `);
  }

  if (
    options.categories
    && options.categories.length > 0
  ) {
    rows.push(`
      <div>
        <strong>Choix :</strong>
        ${escapeHtml(
          options.categories.join(", "),
        )}
      </div>
    `);
  }

  if (options.giftCard) {
    rows.push(`
      <div>
        <strong>Carte cadeau :</strong>
        ${escapeHtml(
          options.deliveryType
            === "physical"
            ? "Carte physique"
            : "Carte virtuelle",
        )}
      </div>
    `);

    if (options.amount) {
      rows.push(`
        <div>
          <strong>Montant :</strong>
          ${escapeHtml(options.amount)} €
        </div>
      `);
    }

    if (options.recipientName) {
      rows.push(`
        <div>
          <strong>Destinataire :</strong>
          ${escapeHtml(
            options.recipientName,
          )}
        </div>
      `);
    }

    if (options.senderName) {
      rows.push(`
        <div>
          <strong>Offert par :</strong>
          ${escapeHtml(
            options.senderName,
          )}
        </div>
      `);
    }

    if (options.message) {
      rows.push(`
        <div>
          <strong>Message :</strong>
          ${escapeHtml(
            options.message,
          )}
        </div>
      `);
    }
  }

  if (rows.length === 0) {
    return "";
  }

  return `
    <div
      style="
        margin-top: 6px;
        color: #777777;
        font-size: 11px;
        line-height: 1.6;
      "
    >
      ${rows.join("")}
    </div>
  `;
};

const renderOrderItems = (
  items: OrderItem[],
): string => {
  return items
    .map(item => {
      const quantity =
        Number(item.quantity) || 1;

      const unitPrice =
        Number(item.price) || 0;

      const total =
        unitPrice * quantity;

      return `
        <tr>
          <td
            style="
              padding: 14px;
              border-bottom: 1px solid #eeeeee;
              vertical-align: top;
            "
          >
            <strong>
              ${escapeHtml(
                item.name
                || "Article LYJY",
              )}
            </strong>

            ${renderOrderOptions(
              item.options,
            )}
          </td>

          <td
            style="
              padding: 14px;
              border-bottom: 1px solid #eeeeee;
              text-align: center;
              vertical-align: top;
            "
          >
            ${quantity}
          </td>

          <td
            style="
              padding: 14px;
              border-bottom: 1px solid #eeeeee;
              text-align: right;
              vertical-align: top;
            "
          >
            ${formatPrice(total)}
          </td>
        </tr>
      `;
    })
    .join("");
};

const POST = async (
  req: Request,
) => {
  try {
    const apiKey =
      process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY n'est pas configurée.",
        },
        {
          status: 503,
        },
      );
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL
      || "LYJY Atelier <contact@lyjy.fr>";

    const body: unknown =
      await req.json();

    if (!isEmailRequest(body)) {
      return NextResponse.json(
        {
          error:
            "Données d'e-mail invalides.",
        },
        {
          status: 400,
        },
      );
    }

    const resend =
      new Resend(apiKey);

    /*
     * CONFIRMATION DE COMMANDE
     */
    if (
      body.type
        === "ORDER_CONFIRMATION"
    ) {
      const {
        orderDetails,
      } = body;

      const items =
        orderDetails.items
        ?? [];

      const address =
        orderDetails.address;

      const result =
        await resend.emails.send({
          from:
            fromEmail,

          to: [
            body.email,
          ],

          subject:
            `Confirmation de votre commande ${orderDetails.id}`,

          html: `
            <!DOCTYPE html>

            <html lang="fr">
              <body
                style="
                  margin: 0;
                  padding: 0;
                  background: #f7f5f2;
                  font-family: Arial, sans-serif;
                  color: #222222;
                "
              >
                <div
                  style="
                    max-width: 700px;
                    margin: auto;
                    padding: 40px 20px;
                  "
                >
                  <div
                    style="
                      background: #ffffff;
                      border: 1px solid #e9e4dd;
                    "
                  >
                    <div
                      style="
                        padding: 35px;
                        border-bottom: 2px solid #C4A77D;
                      "
                    >
                      <h1
                        style="
                          margin: 0;
                          color: #C4A77D;
                          font-family: Georgia, serif;
                          letter-spacing: 3px;
                          font-weight: normal;
                          font-size: 24px;
                        "
                      >
                        LYJY ATELIER BIJOUX
                      </h1>

                      <p
                        style="
                          margin: 8px 0 0;
                          color: #777777;
                          font-size: 12px;
                          text-transform: uppercase;
                          letter-spacing: 2px;
                        "
                      >
                        Confirmation & bon de commande
                      </p>
                    </div>

                    <div
                      style="
                        padding: 35px;
                      "
                    >
                      <p>
                        Bonjour
                        ${escapeHtml(
                          orderDetails.clientName
                          || "",
                        )},
                      </p>

                      <p>
                        Merci pour votre commande chez
                        <strong>
                          LYJY Atelier Bijoux
                        </strong>.
                      </p>

                      <div
                        style="
                          margin: 25px 0;
                          padding: 18px;
                          background: #f9f8f6;
                          border-left: 3px solid #C4A77D;
                        "
                      >
                        <strong>
                          Commande :
                        </strong>

                        ${escapeHtml(
                          orderDetails.id,
                        )}
                      </div>

                      <h2
                        style="
                          margin-top: 35px;
                          font-family: Georgia, serif;
                          color: #C4A77D;
                          font-size: 18px;
                          font-weight: normal;
                        "
                      >
                        Bon de commande
                      </h2>

                      <table
                        style="
                          width: 100%;
                          border-collapse: collapse;
                          margin-top: 15px;
                          font-size: 13px;
                        "
                      >
                        <thead>
                          <tr
                            style="
                              background: #f9f8f6;
                              text-transform: uppercase;
                              font-size: 11px;
                              letter-spacing: 1px;
                            "
                          >
                            <th
                              style="
                                padding: 12px;
                                text-align: left;
                              "
                            >
                              Article
                            </th>

                            <th
                              style="
                                padding: 12px;
                                text-align: center;
                              "
                            >
                              Qté
                            </th>

                            <th
                              style="
                                padding: 12px;
                                text-align: right;
                              "
                            >
                              Prix
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          ${renderOrderItems(
                            items,
                          )}
                        </tbody>
                      </table>

                      <div
                        style="
                          margin-top: 25px;
                          margin-left: auto;
                          max-width: 320px;
                          font-size: 13px;
                        "
                      >
                        <div
                          style="
                            display: flex;
                            justify-content: space-between;
                            padding: 7px 0;
                          "
                        >
                          <span>
                            Sous-total
                          </span>

                          <strong>
                            ${formatPrice(
                              orderDetails.subtotal,
                            )}
                          </strong>
                        </div>

                        ${
                          Number(
                            orderDetails.discountApplied,
                          ) > 0
                            ? `
                              <div
                                style="
                                  display: flex;
                                  justify-content: space-between;
                                  padding: 7px 0;
                                  color: #8c704c;
                                "
                              >
                                <span>
                                  Réduction
                                </span>

                                <strong>
                                  -${formatPrice(
                                    orderDetails.discountApplied,
                                  )}
                                </strong>
                              </div>
                            `
                            : ""
                        }

                        ${
                          Number(
                            orderDetails.giftCardAmount,
                          ) > 0
                            ? `
                              <div
                                style="
                                  display: flex;
                                  justify-content: space-between;
                                  padding: 7px 0;
                                  color: #4c8c61;
                                "
                              >
                                <span>
                                  Carte cadeau
                                </span>

                                <strong>
                                  -${formatPrice(
                                    orderDetails.giftCardAmount,
                                  )}
                                </strong>
                              </div>
                            `
                            : ""
                        }

                        <div
                          style="
                            margin-top: 8px;
                            padding-top: 14px;
                            border-top: 1px solid #dddddd;
                            display: flex;
                            justify-content: space-between;
                            font-family: Georgia, serif;
                            font-size: 18px;
                            color: #C4A77D;
                          "
                        >
                          <span>
                            Total
                          </span>

                          <strong>
                            ${formatPrice(
                              orderDetails.total,
                            )}
                          </strong>
                        </div>
                      </div>

                      ${
                        address
                          ? `
                            <div
                              style="
                                margin-top: 35px;
                                padding: 20px;
                                background: #f9f8f6;
                                font-size: 13px;
                                line-height: 1.7;
                              "
                            >
                              <strong>
                                Adresse de livraison
                              </strong>

                              <br />

                              ${escapeHtml(
                                address.street
                                || "",
                              )}

                              ${
                                address.complement
                                  ? `<br />${escapeHtml(address.complement)}`
                                  : ""
                              }

                              <br />

                              ${escapeHtml(
                                address.postalCode
                                || "",
                              )}

                              ${escapeHtml(
                                address.city
                                || "",
                              )}

                              ${
                                address.country
                                  ? `<br />${escapeHtml(address.country)}`
                                  : ""
                              }
                            </div>
                          `
                          : ""
                      }

                      <p
                        style="
                          margin-top: 35px;
                          color: #777777;
                          font-size: 13px;
                          line-height: 1.7;
                        "
                      >
                        Votre commande va maintenant être préparée avec soin.
                        Vous recevrez un nouvel e-mail dès son expédition avec votre numéro de suivi.
                      </p>

                      <p
                        style="
                          margin-top: 30px;
                          color: #C4A77D;
                          font-family: Georgia, serif;
                        "
                      >
                        Merci pour votre confiance.
                        <br />
                        LYJY Atelier Bijoux
                      </p>
                    </div>
                  </div>

                  <p
                    style="
                      text-align: center;
                      color: #999999;
                      font-size: 11px;
                      margin-top: 20px;
                    "
                  >
                    Conservez cet e-mail : il constitue votre récapitulatif et votre bon de commande.
                  </p>
                </div>
              </body>
            </html>
          `,
        });

      if (result.error) {
        throw new Error(
          result.error.message,
        );
      }
    }

    /*
     * NOTIFICATION D'EXPÉDITION
     */
    if (
      body.type
        === "SHIPPING_NOTIF"
    ) {
      const result =
        await resend.emails.send({
          from:
            fromEmail,

          to: [
            body.email,
          ],

          subject:
            `Votre commande ${body.orderDetails.id} a été expédiée !`,

          html: `
            <div
              style="
                max-width: 600px;
                margin: auto;
                padding: 40px;
                font-family: Arial, sans-serif;
              "
            >
              <h1
                style="
                  color: #C4A77D;
                  font-family: Georgia, serif;
                "
              >
                Bonne nouvelle !
              </h1>

              <p>
                Vos bijoux sont en route 🚚
              </p>

              <p>
                Transporteur :
                <strong>
                  ${escapeHtml(
                    body.orderDetails.carrier,
                  )}
                </strong>
              </p>

              <p>
                N° de suivi :
                <strong>
                  ${escapeHtml(
                    body.orderDetails.trackingNumber,
                  )}
                </strong>
              </p>
            </div>
          `,
        });

      if (result.error) {
        throw new Error(
          result.error.message,
        );
      }
    }

    /*
     * CARTE CADEAU
     */
    if (
      body.type
        === "GIFT_CARD_DELIVERY"
    ) {
      const result =
        await resend.emails.send({
          from:
            fromEmail,

          to: [
            body.email,
          ],

          subject:
            `${body.giftCard.senderName} vous offre une carte cadeau LYJY`,

          html: `
            <div
              style="
                max-width: 600px;
                margin: auto;
                padding: 40px;
                background: #111;
                color: #eee;
                font-family: Arial, sans-serif;
                text-align: center;
              "
            >
              <h1
                style="
                  color: #C4A77D;
                  font-family: Georgia, serif;
                  letter-spacing: 3px;
                "
              >
                LYJY ATELIER BIJOUX
              </h1>

              <p>
                Bonjour
                ${escapeHtml(
                  body.giftCard.recipientName,
                )},
              </p>

              <p>
                <strong>
                  ${escapeHtml(
                    body.giftCard.senderName,
                  )}
                </strong>

                vous offre une carte cadeau d'une valeur de :
              </p>

              <p
                style="
                  font-size: 32px;
                  color: #C4A77D;
                "
              >
                <strong>
                  ${escapeHtml(
                    body.giftCard.amount,
                  )} €
                </strong>
              </p>

              ${
                body.giftCard.message
                  ? `
                    <blockquote
                      style="
                        margin: 25px 0;
                        padding: 18px;
                        border-left: 3px solid #C4A77D;
                        background: #1b1b1b;
                      "
                    >
                      ${escapeHtml(
                        body.giftCard.message,
                      )}
                    </blockquote>
                  `
                  : ""
              }

              <p>
                Votre code cadeau :
              </p>

              <p
                style="
                  display: inline-block;
                  padding: 15px 24px;
                  border: 1px solid #C4A77D;
                  color: #C4A77D;
                  font-family: monospace;
                  font-size: 20px;
                  letter-spacing: 2px;
                "
              >
                <strong>
                  ${escapeHtml(
                    body.giftCard.code,
                  )}
                </strong>
              </p>

              <p
                style="
                  margin-top: 28px;
                  color: #aaa;
                  font-size: 13px;
                "
              >
                Saisissez ce code dans le panier pour utiliser votre carte cadeau.
              </p>
            </div>
          `,
        });

      if (result.error) {
        throw new Error(
          result.error.message,
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (
    error: unknown
  ) {
    console.error(
      "Erreur Resend :",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      },
    );
  }
};

export { POST };