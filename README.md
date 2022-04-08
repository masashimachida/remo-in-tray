# RemoInTray

## これは

メニューバーからNatureRemoを操作するものです。Mac用。

## buildするには

[Nature Remoのホームページ](https://home.nature.global/home) から ACCESS TOKEN を生成し、 `.env` に書いておきます。

また使う機器の Appliance ID を API をつかって取得します。

```bash
$ curl -H "Authorization: Bearer <ACCESS TOKEN>" \
       -H "accept: application/json" \
       -X GET "https://api.nature.global/1/appliances"
```

今の所エアコンしか想定してません。