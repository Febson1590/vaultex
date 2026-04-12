import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
  kycDocument: f({
    image: { maxFileSize: "8MB", maxFileCount: 3 },
    pdf:   { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      console.log("[UploadThing] kycDocument middleware running...");
      const session = await auth();
      console.log("[UploadThing] session:", session?.user?.id ?? "NO SESSION");
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UploadThing] kycDocument upload complete:", { userId: metadata.userId, url: file.ufsUrl });
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  supportAttachment: f({ image: { maxFileSize: "4MB", maxFileCount: 2 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
