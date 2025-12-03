import { Shareicon } from "../icons/ShareIcon";

interface CardProps {
  title: string;
  link: string;
  type: any;
}
export function Card({ title, link, type }: CardProps) {
  const normalizedType = type.toLowerCase();

  return (
    <div>
      <div
        className="p-4 bg-white rounded-md border-gray-200 
        max-w-72 border min-h-48 min-w-72 "
      >
        <div className="flex justify-between ">
          <div className="flex items-center text-md">
            <div className="text-gray-500 pr-2">
              <Shareicon />
            </div>
            {title}
          </div>
          <div className="flex items-center">
            <div className="pr-2 text-gray-500">
              <a href={link} target="_blank"></a>
              <Shareicon />
            </div>

            <div className="text-gray-500">
              <Shareicon />
            </div>
          </div>
        </div>

        <div className="pt-4">
          {/* YOUTUBE */}
          {normalizedType === "youtube" && (
            <iframe
              className="w-full aspect-video rounded"
              src={`https://www.youtube.com/embed/${link
                .split("/")
                .pop()
                ?.replace("watch?v=", "")}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          )}

          {/* TWITTER */}
          {normalizedType === "twitter" && (
            <blockquote className="twitter-tweet">
              <a href={link.replace("x.com", "twitter.com")} />
            </blockquote>
          )}
        </div>
      </div>
    </div>
  );
}
