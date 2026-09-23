package wa

import "testing"

func TestRenderTemplate(t *testing.T) {
	got := RenderTemplate("Halo {{nama}}, dari {{perusahaan}}!", map[string]string{"nama": "Budi", "perusahaan": "PT X"})
	if got != "Halo Budi, dari PT X!" {
		t.Fatalf("got %q", got)
	}
	if got := RenderTemplate("Hi {{ Nama }}!", map[string]string{"nama": "Siti"}); got != "Hi Siti!" {
		t.Fatalf("case-insensitive gagal: %q", got)
	}
	if got := RenderTemplate("Halo {{namma}}", map[string]string{"nama": "Budi"}); got != "Halo {{namma}}" {
		t.Fatalf("unknown key harus dibiarkan: %q", got)
	}
	v := ContactVars("Budi Santoso", "PT X", "b@x.id", "+6281")
	if v["nama"] != "Budi" || v["nama_lengkap"] != "Budi Santoso" {
		t.Fatalf("contact vars salah: %v", v)
	}
}
