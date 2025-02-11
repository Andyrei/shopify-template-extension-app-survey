import { json } from "@remix-run/node";
// import { cors } from "remix-utils/cors";
import { addDocumentResponseHeaders, authenticate, unauthenticated } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
  const { cors } = await authenticate.public.checkout(request)


  // as it specified in here
  // https://shopify.dev/docs/api/checkout-ui-extensions/2024-10/configuration#network-access:~:text=extension%27s%20configuration%20file.-,Required%20CORS%20headers,-UI%20extensions%20run
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  addDocumentResponseHeaders(request, headers)

  if (request.method === 'OPTIONS') {
    const response = json({
      status: 200,
    });
    // Pass the CORS options to the cors middleware
    return await cors(response);
  }

  const response = json({
    ok: true,
    message: 'Success',
    data: 'proxy loader response',
  });

  // Pass the CORS options to the cors middleware
  return cors(response);
}
