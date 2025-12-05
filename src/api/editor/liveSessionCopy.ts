import alovaInstance from '@/utils/request';
import qs from 'query-string';

const BASE_URL = '/live/sessionCopy';


export function listLiveSessionCopy(params) {
  // return alovaInstance.Get(`${BASE_URL}/page`, {
  //   params,
  //   paramsSerializer: (obj) => {
  //     return qs.stringify(obj);
  //   },
  // });
}

export function getLiveSessionCopy(id) {
  // return alovaInstance.get(`${BASE_URL}/info/${id}`);
}

export function addLiveSessionCopy(req) {
  // return alovaInstance.post(`${BASE_URL}/add`, req);
}

export function updateLiveSessionCopy(req) {
  // return alovaInstance.post(`${BASE_URL}/update`, req);
}

export function deleteLiveSessionCopy(ids) {
  // return alovaInstance.delete(`${BASE_URL}/remove/${ids}`);
}
