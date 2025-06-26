package main

import (
	"context"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

func (app *application) presignedURLHandler(w http.ResponseWriter, r *http.Request) {
	fileName := r.URL.Query().Get("fileName")
	ext := filepath.Ext(fileName)
	if ext == "" {
		app.badRequestResponse(w, r, errors.New(`missing file extension in "fileName" query parameter`))
		return
	}

	objectKey := r.URL.Query().Get("key")
	var key string
	if objectKey != "" {
		// TODO: verify user permissions for the specified key
		key = objectKey
	} else {
		key = "images/" + uuid.New().String() + ext
	}

	policy := minio.NewPostPolicy()
	policy.SetBucket(app.config.S3.bucket)
	policy.SetKey(key)
	policy.SetExpires(time.Now().UTC().Add(15 * time.Minute))
	policy.SetContentTypeStartsWith("image/")
	policy.SetContentType(mime.TypeByExtension(ext))
	policy.SetContentLengthRange(0, 25*1024*1024) // 25 MB limit
	policy.SetSuccessStatusAction("201")

	url, formData, err := app.S3LikeClient.PresignedPostPolicy(context.Background(), policy)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// for k, v := range formData {
	// 	fmt.Printf("%s:%s\n", k, v)
	// }

	var host string
	if app.config.env == "development" {
		host = "localhost:9000"
	} else {
		host = url.Host
	}

	data := envelope{
		"url":        fmt.Sprintf("%s://%s%s", url.Scheme, host, url.Path),
		"form_data":  formData,
		"public_url": fmt.Sprintf("%s/%s", app.config.S3.baseURL, key),
	}

	err = app.writeJSON(w, http.StatusOK, data, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
