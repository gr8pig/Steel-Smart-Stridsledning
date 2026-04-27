import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens/api.token';
import { ForestStructure, TrainingSamplesPayload } from '../ml/forest.models';

@Injectable({ providedIn: 'root' })
export class ForestStructureService {
  private http = inject(HttpClient);
  private base = inject(API_BASE_URL);

  getForestStructure(): Observable<ForestStructure> {
    return this.http.get<ForestStructure>(`${this.base}/api/ml/forest-structure`);
  }

  getTrainingSamples(n = 5000, perplexity = 30.0): Observable<TrainingSamplesPayload> {
    return this.http.get<TrainingSamplesPayload>(`${this.base}/api/ml/training-samples`, {
      params: { n: n.toString(), perplexity: perplexity.toString() },
    });
  }
}