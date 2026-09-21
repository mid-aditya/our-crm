import { describe, it, expect } from "vitest";
import { renderTemplate, contactVars } from "../src/modules/campaigns/routes.js";

describe("renderTemplate (blasting variables)", () => {
  it("mengganti variabel yang dikenal", () => {
    expect(
      renderTemplate("Halo {{nama}}, dari {{perusahaan}}!", { nama: "Budi", perusahaan: "PT X" }),
    ).toBe("Halo Budi, dari PT X!");
  });

  it("case-insensitive & toleran spasi", () => {
    expect(renderTemplate("Hi {{ Nama }}!", { nama: "Siti" })).toBe("Hi Siti!");
  });

  it("variabel tak dikenal dibiarkan (typo mudah terdeteksi)", () => {
    expect(renderTemplate("Halo {{namma}}", { nama: "Budi" })).toBe("Halo {{namma}}");
  });

  it("contactVars memetakan field kontak", () => {
    const v = contactVars({ fullName: "Budi Santoso", companyName: "PT X", email: "b@x.id", phone: "+6281" });
    expect(v.nama).toBe("Budi");
    expect(v.nama_lengkap).toBe("Budi Santoso");
    expect(v.perusahaan).toBe("PT X");
  });
});
