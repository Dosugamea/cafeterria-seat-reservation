import requests
import json

ENDPOINT = "http://localhost:3000/admin/verify_reserve"
PARAMS ={
    "userId":"7",
    "reserveId":"1"
}
print(requests.post(ENDPOINT,data=PARAMS).text)