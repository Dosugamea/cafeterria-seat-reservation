import requests
import json
from time import sleep

ENDPOINT = "http://localhost:3000/admin/verify_reserve"
PARAMS ={
    "userID":"1",
    "reserveID":"14"
}
resp = requests.post(ENDPOINT,data=PARAMS)
print(resp.status_code)
print(resp.text)