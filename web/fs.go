package web

import (
	"embed"
	"io/fs"
	"log"
)

//go:embed frontend/dist
var webFS embed.FS

var (
	DistFs      fs.FS
	StaticFiles = make(map[string]struct{})
)

func init() {
	var err error
	DistFs, err = fs.Sub(webFS, "frontend/dist")
	if err != nil {
		log.Fatalf("failed to sub webFS: %v", err)
	}

	err = fs.WalkDir(DistFs, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			StaticFiles[path] = struct{}{}
		}
		return nil
	})
	if err != nil {
		log.Fatalf("failed to walk DistFS: %v", err)
	}
}
